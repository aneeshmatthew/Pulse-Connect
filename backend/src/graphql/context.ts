import { PubSub } from 'graphql-subscriptions';
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { createLoaders, Loaders } from '../lib/dataloader';

export const pubsub = new PubSub();

export const EVENTS = {
  NEW_POST: 'NEW_POST',
  POST_UPDATED: 'POST_UPDATED',
  NEW_COMMENT: 'NEW_COMMENT',
  NEW_MESSAGE: 'NEW_MESSAGE',
  MESSAGE_UPDATED: 'MESSAGE_UPDATED',
  TYPING_STATUS: 'TYPING_STATUS',
  NEW_NOTIFICATION: 'NEW_NOTIFICATION',
  USER_ONLINE_STATUS: 'USER_ONLINE_STATUS',
  NEW_STORY: 'NEW_STORY',
} as const;

export type EventKey = keyof typeof EVENTS;

export interface GraphQLContext {
  user: IUser | null;
  pubsub: typeof pubsub;
  loaders: Loaders;
}

const JWT_SECRET = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
};

function verifyToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET()) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

export const createContext = async ({ req }: { req: Request }): Promise<GraphQLContext> => {
  let user: IUser | null = null;

  const authHeader = req?.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const userId = verifyToken(token);
    if (userId) {
      user = await User.findById(userId).select('-password').lean() as IUser | null;
    }
  }

  return { user, pubsub, loaders: createLoaders() };
};

export const createWsContext = async (ctx: any): Promise<GraphQLContext> => {
  let user: IUser | null = null;

  const raw: string | undefined =
    ctx.connectionParams?.authorization || ctx.connectionParams?.token;
  const token = raw?.replace('Bearer ', '').trim();

  if (token) {
    const userId = verifyToken(token);
    if (userId) {
      user = await User.findById(userId).select('-password').lean() as IUser | null;
    }
  }

  return { user, pubsub, loaders: createLoaders() };
};

export function requireAuth(user: IUser | null): asserts user is IUser {
  if (!user) {
    throw new Error('Not authenticated'); // will be caught and wrapped
  }
}
