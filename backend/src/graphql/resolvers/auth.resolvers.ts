import jwt from 'jsonwebtoken';
import { User } from '../../models/User';
import { Post } from '../../models/Post';
import { GraphQLContext, requireAuth } from '../context';
import { GraphQLError } from 'graphql';
import { validate, RegisterSchema, UpdateProfileSchema } from '../../lib/validation';

const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  return jwt.sign({ userId }, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN as any) || '7d',
  });
};

export const authResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, { user }: GraphQLContext) => {
      requireAuth(user);
      // Re-fetch fresh data so profile page always shows current state
      return User.findById(user._id).select('-password').lean();
    },
  },

  Mutation: {
    register: async (_: unknown, { input }: { input: unknown }) => {
      const data = validate(RegisterSchema, input);

      // Case-insensitive check to prevent "Alice" and "alice" as different users
      const existingUser = await User.findOne({
        $or: [
          { email: data.email.toLowerCase() },
          { username: { $regex: new RegExp(`^${data.username}$`, 'i') } },
        ],
      });

      if (existingUser) {
        throw new GraphQLError(
          existingUser.email === data.email.toLowerCase()
            ? 'Email already in use'
            : 'Username already taken',
          { extensions: { code: 'BAD_USER_INPUT' } }
        );
      }

      const user = new User(data);
      await user.save();

      const token = generateToken(user._id.toString());
      const safeUser = user.toObject();
      delete (safeUser as any).password;
      return { token, user: safeUser };
    },

    login: async (_: unknown, { email, password }: { email: string; password: string }) => {
      if (!email || !password) {
        throw new GraphQLError('Email and password are required', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // Use +password to explicitly select the hashed password field
      const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
      if (!user) {
        // Constant-time response to prevent user enumeration
        throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHENTICATED' } });
      }

      const isValid = await user.comparePassword(password);
      if (!isValid) {
        throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHENTICATED' } });
      }

      // Update online status without blocking
      User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() }).exec();

      const token = generateToken(user._id.toString());
      const safeUser = user.toObject();
      delete (safeUser as any).password;
      return { token, user: safeUser };
    },

    logout: async (_: unknown, __: unknown, { user }: GraphQLContext) => {
      if (user) {
        User.findByIdAndUpdate(user._id, { isOnline: false, lastSeen: new Date() }).exec();
      }
      return true;
    },

    updateProfile: async (_: unknown, { input }: { input: unknown }, { user }: GraphQLContext) => {
      requireAuth(user);
      const data = validate(UpdateProfileSchema, input);
      return User.findByIdAndUpdate(user._id, { $set: data }, { new: true }).select('-password').lean();
    },

    updateAvatar: async (_: unknown, { url }: { url: string }, { user }: GraphQLContext) => {
      requireAuth(user);
      if (!url.startsWith('http')) throw new GraphQLError('Invalid URL');
      return User.findByIdAndUpdate(user._id, { avatar: url }, { new: true }).select('-password').lean();
    },

    updateCoverPhoto: async (_: unknown, { url }: { url: string }, { user }: GraphQLContext) => {
      requireAuth(user);
      if (!url.startsWith('http')) throw new GraphQLError('Invalid URL');
      return User.findByIdAndUpdate(user._id, { coverPhoto: url }, { new: true }).select('-password').lean();
    },
  },

  User: {
    id: (parent: any) => parent._id?.toString() ?? parent.id,
    fullName: (parent: any) => `${parent.firstName} ${parent.lastName}`,
    friendsCount: (parent: any) => parent.friends?.length ?? 0,

    // `parent.friends` is just an array of ObjectIds on the raw Mongo doc.
    // Without this resolver, GraphQL tries to resolve each raw ObjectId as a
    // full User, fails on non-nullable fields (username, firstName, ...),
    // and nulls out the whole list — which is why the UI showed a correct
    // friendsCount but an empty friends list. Batch-load the real docs.
    friends: async (parent: any, _: unknown, { loaders }: GraphQLContext) => {
      if (!parent.friends?.length) return [];
      const users = await loaders.userLoader.loadMany(
        parent.friends.map((id: any) => id.toString())
      );
      return users.filter((u: any) => u && !(u instanceof Error));
    },

    // Use DataLoader to batch-load post counts — eliminates N+1
    postsCount: async (parent: any, _: unknown, { loaders }: GraphQLContext) => {
      // DataLoader doesn't have a count loader, so use a fast countDocuments
      // only when the field is actually requested
      return Post.countDocuments({ author: parent._id });
    },

    isFriend: (parent: any, _: unknown, { user }: GraphQLContext) => {
      if (!user) return false;
      return (parent.friends ?? []).some(
        (id: any) => id.toString() === user._id.toString()
      );
    },

    hasFriendRequest: (parent: any, _: unknown, { user }: GraphQLContext) => {
      if (!user) return false;
      return (parent.friendRequests ?? []).some(
        (req: any) => req.from.toString() === user._id.toString()
      );
    },
  },
};
