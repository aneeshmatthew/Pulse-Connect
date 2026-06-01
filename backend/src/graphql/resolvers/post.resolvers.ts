import { Post } from '../../models/Post';
import { Comment } from '../../models/Comment';
import { Notification } from '../../models/Notification';
import { GraphQLContext, requireAuth, EVENTS } from '../context';
import { GraphQLError } from 'graphql';
import { validate, CreatePostSchema } from '../../lib/validation';

const MIN_FEED_THRESHOLD = 5; // if fewer than this, pad with public posts

function decodeCursor(cursor: string): Date {
  try {
    return new Date(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new GraphQLError('Invalid pagination cursor', { extensions: { code: 'BAD_USER_INPUT' } });
  }
}

function encodeCursor(date: Date): string {
  return Buffer.from(date.toISOString(), 'utf8').toString('base64url');
}

/**
 * Smart feed builder:
 * 1. Always fetches friend/own posts first (social graph)
 * 2. If results < threshold (new user / no friends), backfills with recent public posts
 * 3. Deduplicates so the same post never appears twice
 */
async function buildFeed(
  userId: any,
  friendIds: any[],
  cursor: string | undefined,
  safeLimit: number
) {
  const authorIds = [userId, ...friendIds];
  const cursorFilter = cursor ? { createdAt: { $lt: decodeCursor(cursor) } } : {};

  // Primary query: own + friends posts
  const primaryQuery: any = {
    author: { $in: authorIds },
    visibility: { $in: ['public', 'friends'] },
    ...cursorFilter,
  };

  const primaryPosts = await Post.find(primaryQuery)
    .sort({ createdAt: -1 })
    .limit(safeLimit + 1)
    .populate('author', '-password')
    .lean();

  // If we have enough posts from friends, return early
  if (primaryPosts.length >= safeLimit + 1) {
    const hasMore = true;
    const items = primaryPosts.slice(0, safeLimit);
    return { posts: items, hasMore, nextCursor: encodeCursor(items[items.length - 1].createdAt) };
  }

  if (primaryPosts.length > safeLimit) {
    const items = primaryPosts.slice(0, safeLimit);
    return { posts: items, hasMore: true, nextCursor: encodeCursor(items[items.length - 1].createdAt) };
  }

  // Backfill with recent public posts the user hasn't seen yet
  const seenIds = new Set(primaryPosts.map((p: any) => p._id.toString()));
  const needed = safeLimit + 1 - primaryPosts.length;

  const publicQuery: any = {
    _id: { $nin: Array.from(seenIds) },
    author: { $nin: authorIds }, // exclude posts already in primary
    visibility: 'public',
    ...cursorFilter,
  };

  const publicPosts = await Post.find(publicQuery)
    .sort({ createdAt: -1 })
    .limit(needed)
    .populate('author', '-password')
    .lean();

  // Merge: friend posts first, then public discovery posts
  const merged = [...primaryPosts, ...publicPosts];

  // Re-sort by createdAt so timeline is coherent
  merged.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const hasMore = merged.length > safeLimit;
  const items = hasMore ? merged.slice(0, safeLimit) : merged;
  const nextCursor = items.length > 0 ? encodeCursor(items[items.length - 1].createdAt) : null;

  return { posts: items, hasMore, nextCursor };
}

export const postResolvers = {
  Query: {
    feed: async (_: unknown, { cursor, limit = 10 }: any, { user }: GraphQLContext) => {
      requireAuth(user);
      const safeLimit = Math.min(Math.max(1, limit), 50);
      const friendIds = user.friends ?? [];

      const result = await buildFeed(user._id, friendIds, cursor, safeLimit);
      return { ...result, total: -1 };
    },

    exploreFeed: async (_: unknown, { cursor, limit = 10 }: any) => {
      const safeLimit = Math.min(Math.max(1, limit), 50);
      const query: any = { visibility: 'public' };
      if (cursor) query.createdAt = { $lt: decodeCursor(cursor) };

      const posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .limit(safeLimit + 1)
        .populate('author', '-password')
        .lean();

      const hasMore = posts.length > safeLimit;
      const items = hasMore ? posts.slice(0, safeLimit) : posts;
      const nextCursor = hasMore ? encodeCursor(items[items.length - 1].createdAt) : null;

      return { posts: items, hasMore, nextCursor, total: -1 };
    },

    post: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const post = await Post.findById(id)
        .populate('author', '-password')
        .populate('tags', 'id username firstName lastName avatar isOnline isVerified')
        .populate({
          path: 'sharedFrom',
          populate: { path: 'author', select: '-password' },
        })
        .lean();

      if (!post) return null;
      Post.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();
      return post;
    },

    userPosts: async (_: unknown, { userId, cursor, limit = 10 }: any, { user }: GraphQLContext) => {
      const safeLimit = Math.min(Math.max(1, limit), 50);
      const isOwner = user?._id.toString() === userId;
      const isFriend = user?.friends.some((id: any) => id.toString() === userId);

      const query: any = { author: userId };
      if (!isOwner) {
        query.visibility = isFriend ? { $in: ['public', 'friends'] } : 'public';
      }
      if (cursor) query.createdAt = { $lt: decodeCursor(cursor) };

      const posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .limit(safeLimit + 1)
        .populate('author', '-password')
        .lean();

      const hasMore = posts.length > safeLimit;
      const items = hasMore ? posts.slice(0, safeLimit) : posts;
      const nextCursor = hasMore ? encodeCursor(items[items.length - 1].createdAt) : null;

      return { posts: items, hasMore, nextCursor, total: -1 };
    },
  },

  Mutation: {
    createPost: async (_: unknown, { input }: { input: unknown }, { user, pubsub }: GraphQLContext) => {
      requireAuth(user);
      const data = validate(CreatePostSchema, input);

      if (!data.content?.trim() && !data.media?.length) {
        throw new GraphQLError('Post must have content or media', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const post = new Post({
        author: user._id,
        content: data.content?.trim() ?? '',
        media: data.media ?? [],
        visibility: (data.visibility ?? 'PUBLIC').toLowerCase(),
        tags: data.tags ?? [],
        location: data.location,
        feeling: data.feeling,
      });
      await post.save();
      await post.populate('author', '-password');

      pubsub.publish(EVENTS.NEW_POST, { newPost: post.toObject() });
      return post;
    },

    updatePost: async (_: unknown, { id, content }: any, { user, pubsub }: GraphQLContext) => {
      requireAuth(user);
      if (!content?.trim()) {
        throw new GraphQLError('Content cannot be empty', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const post = await Post.findById(id);
      if (!post) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
      if (post.author.toString() !== user._id.toString()) {
        throw new GraphQLError('Not authorized', { extensions: { code: 'FORBIDDEN' } });
      }

      post.editHistory.push({ content: post.content, editedAt: new Date() });
      post.content = content.trim();
      post.isEdited = true;
      await post.save();
      await post.populate('author', '-password');

      pubsub.publish(EVENTS.POST_UPDATED, { postUpdated: post.toObject() });
      return post;
    },

    deletePost: async (_: unknown, { id }: { id: string }, { user }: GraphQLContext) => {
      requireAuth(user);
      const post = await Post.findById(id);
      if (!post) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
      if (post.author.toString() !== user._id.toString()) {
        throw new GraphQLError('Not authorized', { extensions: { code: 'FORBIDDEN' } });
      }

      await Promise.all([
        Post.findByIdAndDelete(id),
        Comment.deleteMany({ post: id }),
      ]);
      return true;
    },

    reactToPost: async (_: unknown, { postId, type }: any, { user, pubsub }: GraphQLContext) => {
      requireAuth(user);

      const reactionType = type.toLowerCase();
      const post = await Post.findById(postId).populate('author', '_id firstName lastName');
      if (!post) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });

      const existingIdx = post.reactions.findIndex(
        (r) => r.user.toString() === user._id.toString()
      );

      const isNew = existingIdx === -1;
      if (isNew) {
        post.reactions.push({ user: user._id, type: reactionType as any, createdAt: new Date() });
      } else {
        post.reactions[existingIdx].type = reactionType as any;
      }

      await post.save();

      if (isNew && (post.author as any)._id.toString() !== user._id.toString()) {
        Notification.create({
          recipient: (post.author as any)._id,
          sender: user._id,
          type: 'post_like',
          entityId: post._id,
          entityType: 'post',
          message: `${user.firstName} ${user.lastName} reacted to your post`,
        }).catch(console.error);
      }

      await post.populate('author', '-password');
      pubsub.publish(EVENTS.POST_UPDATED, { postUpdated: post.toObject() });
      return post;
    },

    removeReaction: async (_: unknown, { postId }: { postId: string }, { user, pubsub }: GraphQLContext) => {
      requireAuth(user);
      const post = await Post.findByIdAndUpdate(
        postId,
        { $pull: { reactions: { user: user._id } } },
        { new: true }
      ).populate('author', '-password');

      if (!post) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
      pubsub.publish(EVENTS.POST_UPDATED, { postUpdated: post.toObject() });
      return post;
    },

    sharePost: async (_: unknown, { postId, content }: any, { user, pubsub }: GraphQLContext) => {
      requireAuth(user);

      const original = await Post.findById(postId);
      if (!original) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
      if (original.visibility === 'private') {
        throw new GraphQLError('Cannot share a private post', { extensions: { code: 'FORBIDDEN' } });
      }

      const sharedPost = new Post({
        author: user._id,
        content: content?.trim() ?? '',
        sharedFrom: postId,
        visibility: 'public',
      });
      await sharedPost.save();

      Post.findByIdAndUpdate(postId, { $addToSet: { shares: user._id } }).exec();

      await sharedPost.populate('author', '-password');
      pubsub.publish(EVENTS.NEW_POST, { newPost: sharedPost.toObject() });
      return sharedPost;
    },

    pinPost: async (_: unknown, { postId }: { postId: string }, { user }: GraphQLContext) => {
      requireAuth(user);
      const post = await Post.findById(postId);
      if (!post) throw new GraphQLError('Post not found', { extensions: { code: 'NOT_FOUND' } });
      if (post.author.toString() !== user._id.toString()) {
        throw new GraphQLError('Not authorized', { extensions: { code: 'FORBIDDEN' } });
      }
      post.isPinned = !post.isPinned;
      await post.save();
      return post;
    },
  },

  Post: {
    id: (parent: any) => parent._id?.toString() ?? parent.id,

    // ✅ FIX: DB stores lowercase ('public') but GraphQL enum Visibility requires uppercase ('PUBLIC')
    visibility: (parent: any) => (parent.visibility ?? 'public').toUpperCase(),

    commentsCount: async (parent: any, _: unknown, { loaders }: GraphQLContext) => {
      return loaders.commentCountLoader.load(parent._id.toString());
    },

    sharesCount: (parent: any) => parent.shares?.length ?? 0,

    myReaction: (parent: any, _: unknown, { user }: GraphQLContext) => {
      if (!user) return null;
      const r = parent.reactions?.find(
        (r: any) => r.user.toString() === user._id.toString()
      );
      return r ? r.type.toUpperCase() : null;
    },

    reactionSummary: (parent: any) => {
      const summary: Record<string, number> = {};
      (parent.reactions ?? []).forEach((r: any) => {
        const type = r.type.toUpperCase();
        summary[type] = (summary[type] ?? 0) + 1;
      });
      return Object.entries(summary).map(([type, count]) => ({ type, count }));
    },

    comments: async (parent: any, { limit = 3, offset = 0 }: any) => {
      const safeLimit = Math.min(limit, 20);
      return Comment.find({ post: parent._id, parentComment: null })
        .sort({ createdAt: 1 })
        .skip(offset)
        .limit(safeLimit)
        .populate('author', '-password')
        .lean();
    },
  },

  // ✅ FIX: Reaction.type stored as 'like' in DB, schema enum ReactionType expects 'LIKE'
  // This resolver applies everywhere Reaction appears — Post reactions, Comment reactions
  Reaction: {
    type: (parent: any) => (parent.type ?? 'like').toUpperCase(),
    user: async (parent: any, _: unknown, { loaders }: GraphQLContext) => {
      // If already populated (object with _id), return directly
      if (parent.user && typeof parent.user === 'object' && parent.user._id) {
        return parent.user;
      }
      const userId = parent.user?.toString();
      if (!userId) return null;
      return loaders.userLoader.load(userId);
    },
  },

  // ✅ FIX: Media.type stored as 'image'/'video'/'gif' in DB, schema enum MediaType expects 'IMAGE'/'VIDEO'/'GIF'
  Media: {
    type: (parent: any) => (parent.type ?? 'image').toUpperCase(),
  },
};
