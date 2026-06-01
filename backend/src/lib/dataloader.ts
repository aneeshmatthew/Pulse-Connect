import DataLoader from 'dataloader';
import { User } from '../models/User';
import { Comment } from '../models/Comment';
import mongoose from 'mongoose';

/**
 * Create fresh DataLoaders per-request. Never share across requests.
 * Batches DB calls within a single GraphQL operation → eliminates N+1.
 */
export function createLoaders() {
  const userLoader = new DataLoader<string, any>(
    async (ids) => {
      const users = await User.find({ _id: { $in: ids } }).lean();
      const map = new Map(users.map((u: any) => [u._id.toString(), u]));
      return ids.map((id) => map.get(id) ?? null);
    },
    { cache: true }
  );

  const commentCountLoader = new DataLoader<string, number>(
    async (postIds) => {
      const results = await Comment.aggregate([
        {
          $match: {
            post: { $in: postIds.map((id) => new mongoose.Types.ObjectId(id)) },
            parentComment: null,
          },
        },
        { $group: { _id: '$post', count: { $sum: 1 } } },
      ]);
      const map = new Map(results.map((r: any) => [r._id.toString(), r.count as number]));
      return postIds.map((id) => map.get(id) ?? 0);
    },
    { cache: true }
  );

  return { userLoader, commentCountLoader };
}

export type Loaders = ReturnType<typeof createLoaders>;
