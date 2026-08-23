import { User } from '../../models/User';
import { Notification } from '../../models/Notification';
import { GraphQLContext, requireAuth, EVENTS } from '../context';
import { GraphQLError } from 'graphql';

export const userResolvers = {
  Query: {
    user: async (_: unknown, { id, username }: any) => {
      if (id) return User.findById(id).select('-password').lean();
      if (username) return User.findOne({ username: username.toLowerCase() }).select('-password').lean();
      return null;
    },

    searchUsers: async (_: unknown, { query, limit = 10 }: any, { user }: GraphQLContext) => {
      if (!query?.trim() || query.trim().length < 2) return [];
      const safeLimit = Math.min(limit, 20);

      // Use MongoDB text search for indexed fields; fallback regex for username
      const regex = new RegExp(query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const users = await User.find({
        $and: [
          { _id: { $ne: user?._id } },
          {
            $or: [
              { firstName: regex },
              { lastName: regex },
              { username: regex },
            ],
          },
        ],
      })
        .select('-password')
        .limit(safeLimit)
        .lean();

      return users;
    },

    suggestedFriends: async (_: unknown, { limit = 10 }: any, { user }: GraphQLContext) => {
      if (!user) return [];
      const safeLimit = Math.min(limit, 20);

      // Exclude self and existing friends
      const exclude = [user._id, ...(user.friends ?? [])];
      return User.find({ _id: { $nin: exclude } })
        .select('-password')
        .limit(safeLimit)
        .lean();
    },

    // Current user's incoming pending friend requests, with sender details
    // populated and sorted newest-first — backs the Friends page.
    friendRequests: async (_: unknown, __: unknown, { user }: GraphQLContext) => {
      requireAuth(user);
      const fresh = await User.findById(user._id).select('friendRequests').lean();
      const requests = (fresh?.friendRequests ?? []) as any[];
      if (!requests.length) return [];

      const senders = await User.find({ _id: { $in: requests.map((r) => r.from) } })
        .select('-password')
        .lean();
      const byId = new Map(senders.map((s: any) => [s._id.toString(), s]));

      return requests
        .map((r) => ({ from: byId.get(r.from.toString()), sentAt: r.sentAt }))
        .filter((r) => r.from) // drop requests from since-deleted accounts
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    },

    // Users the current user has sent a still-pending request to — the
    // "Sent" side of the same feature, pairs with cancelFriendRequest.
    sentFriendRequests: async (_: unknown, __: unknown, { user }: GraphQLContext) => {
      requireAuth(user);
      return User.find({ 'friendRequests.from': user._id })
        .select('-password')
        .lean();
    },
  },

  Mutation: {
    sendFriendRequest: async (_: unknown, { userId }: { userId: string }, { user, pubsub }: GraphQLContext) => {
      requireAuth(user);
      if (userId === user._id.toString()) {
        throw new GraphQLError('Cannot add yourself', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const target = await User.findById(userId).select('-password');
      if (!target) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });

      const alreadyFriend = (target.friends ?? []).some(
        (id: any) => id.toString() === user._id.toString()
      );
      if (alreadyFriend) {
        throw new GraphQLError('Already friends', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      const alreadyRequested = (target.friendRequests ?? []).some(
        (req: any) => req.from.toString() === user._id.toString()
      );
      if (alreadyRequested) {
        throw new GraphQLError('Friend request already sent', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      await User.findByIdAndUpdate(userId, {
        $push: { friendRequests: { from: user._id, sentAt: new Date() } },
      });

      const notification = await Notification.create({
        recipient: userId,
        sender: user._id,
        type: 'FRIEND_REQUEST',
        message: `${user.firstName} ${user.lastName} sent you a friend request`,
      });

      pubsub.publish(EVENTS.NEW_NOTIFICATION, { newNotification: notification });

      return target;
    },

    acceptFriendRequest: async (_: unknown, { userId }: { userId: string }, { user, pubsub }: GraphQLContext) => {
      requireAuth(user);

      const hasRequest = (user.friendRequests ?? []).some(
        (req: any) => req.from.toString() === userId
      );
      if (!hasRequest) {
        throw new GraphQLError('No friend request from this user', { extensions: { code: 'BAD_USER_INPUT' } });
      }

      // Update both users in parallel
      await Promise.all([
        User.findByIdAndUpdate(user._id, {
          $pull: { friendRequests: { from: userId } },
          $addToSet: { friends: userId },
        }),
        User.findByIdAndUpdate(userId, {
          $addToSet: { friends: user._id },
        }),
      ]);

      const notification = await Notification.create({
        recipient: userId,
        sender: user._id,
        type: 'FRIEND_ACCEPT',
        message: `${user.firstName} ${user.lastName} accepted your friend request`,
      });

      pubsub.publish(EVENTS.NEW_NOTIFICATION, { newNotification: notification });

      return User.findById(userId).select('-password').lean();
    },

    declineFriendRequest: async (_: unknown, { userId }: { userId: string }, { user }: GraphQLContext) => {
      requireAuth(user);
      await User.findByIdAndUpdate(user._id, {
        $pull: { friendRequests: { from: userId } },
      });
      return true;
    },

    // Withdraws a request the CURRENT user sent to `userId` (the recipient).
    // declineFriendRequest only ever touches the caller's OWN incoming
    // list, so it can't be reused here — the caller is the sender in this
    // case, and needs to remove themselves from the RECIPIENT's list instead.
    cancelFriendRequest: async (_: unknown, { userId }: { userId: string }, { user }: GraphQLContext) => {
      requireAuth(user);
      await User.findByIdAndUpdate(userId, {
        $pull: { friendRequests: { from: user._id } },
      });
      return true;
    },

    removeFriend: async (_: unknown, { userId }: { userId: string }, { user }: GraphQLContext) => {
      requireAuth(user);
      await Promise.all([
        User.findByIdAndUpdate(user._id, { $pull: { friends: userId } }),
        User.findByIdAndUpdate(userId, { $pull: { friends: user._id } }),
      ]);
      return true;
    },

    followUser: async (_: unknown, { userId }: { userId: string }, { user }: GraphQLContext) => {
      requireAuth(user);
      await Promise.all([
        User.findByIdAndUpdate(user._id, { $addToSet: { following: userId } }),
        User.findByIdAndUpdate(userId, { $addToSet: { followers: user._id } }),
      ]);
      return User.findById(userId).select('-password').lean();
    },

    unfollowUser: async (_: unknown, { userId }: { userId: string }, { user }: GraphQLContext) => {
      requireAuth(user);
      await Promise.all([
        User.findByIdAndUpdate(user._id, { $pull: { following: userId } }),
        User.findByIdAndUpdate(userId, { $pull: { followers: user._id } }),
      ]);
      return User.findById(userId).select('-password').lean();
    },
  },
};
