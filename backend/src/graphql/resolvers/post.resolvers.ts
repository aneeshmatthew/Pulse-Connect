import { Post } from '../../models/Post';
import { Comment } from '../../models/Comment';
import { Notification } from '../../models/Notification';
import { GraphQLContext, requireAuth, EVENTS } from '../context';
import { GraphQLError } from 'graphql';
import { validate, CreatePostSchema } from '../../lib/validation';

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

export const postResolvers = {
  Query: {
    feed: async (_: unknown, { cursor, limit = 10 }: any, { user }: GraphQLContext) => {
      requireAuth(user);

      const safeLimit = Math.min(Math.max(1, limit), 50);
      const friendIds = user.friends ?? [];
      const authorIds = [user._id, ...friendIds];

      const query: any = {
        author: { $in: authorIds },
        visibility: { $in: ['public', 'friends'] },
      };
      if (cursor) query.createdAt = { $lt: decodeCursor(cursor) };

      const posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .limit(safeLimit + 1)
        .populate('author', '-password')
        .populate('tags', 'id username firstName lastName avatar isOnline isVerified')
        .lean();

      const hasMore = posts.length > safeLimit;
      const items = hasMore ? posts.slice(0, safeLimit) : posts;
      const nextCursor = hasMore ? encodeCursor(items[items.length - 1].createdAt) : null;

      // No countDocuments — too expensive on every page load
      return { posts: items, hasMore, nextCursor, total: -1 };
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

      // Fire-and-forget view count increment
      Post.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();

      return post;
    },

    userPosts: async (_: unknown, { userId, cursor, limit = 10 }: any, { user }: GraphQLContext) => {
      const safeLimit = Math.min(Math.max(1, limit), 50);
      const isOwner = user?._id.toString() === userId;
      const isFriend = user?.friends.some((id: any) => id.toString() === userId);

      const query: any = { author: userId };
      // Visibility gating
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

      // Must have content or media
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

      // Publish without awaiting — don't block the response
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

      // Delete post + all related comments + notifications in parallel
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

      // Notify post author only on new reaction, not on change
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

      // Update share count without blocking
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

    // Use DataLoader for batched comment counts
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
};
