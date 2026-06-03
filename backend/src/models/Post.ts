import mongoose, { Document, Schema } from 'mongoose';

// TypeScript interfaces use uppercase to match GraphQL enums
export interface IMedia {
  url: string;
  type: 'IMAGE' | 'VIDEO' | 'GIF';
  thumbnail?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface IReaction {
  user: mongoose.Types.ObjectId;
  type: 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';
  createdAt: Date;
}

export interface IPost extends Document {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  media: IMedia[];
  reactions: IReaction[];
  comments: mongoose.Types.ObjectId[];
  shares: mongoose.Types.ObjectId[];
  sharedFrom?: mongoose.Types.ObjectId;
  visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  tags: mongoose.Types.ObjectId[];
  location?: string;
  feeling?: string;
  isPinned: boolean;
  isEdited: boolean;
  editHistory: { content: string; editedAt: Date }[];
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const toUpper = (v: any) => (typeof v === 'string' ? v.toUpperCase() : v);

const mediaSchema = new Schema<IMedia>(
  {
    url: { type: String, required: true },
    // set: toUpper ensures 'image' → 'IMAGE' on every write
    type: { type: String, enum: ['IMAGE', 'VIDEO', 'GIF'], required: true, set: toUpper },
    thumbnail: String,
    width: Number,
    height: Number,
    duration: Number,
  },
  { _id: false }
);

const reactionSchema = new Schema<IReaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'], required: true, set: toUpper },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const postSchema = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, maxlength: 63206, default: '' },
    media: { type: [mediaSchema], default: [] },
    reactions: { type: [reactionSchema], default: [] },
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    shares: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    sharedFrom: { type: Schema.Types.ObjectId, ref: 'Post' },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'FRIENDS', 'PRIVATE'],
      default: 'PUBLIC',
      set: toUpper,
    },
    tags: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    location: { type: String, maxlength: 200 },
    feeling: { type: String, maxlength: 100 },
    isPinned: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    editHistory: [{ content: String, editedAt: Date }],
    viewCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  }
);

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ visibility: 1, createdAt: -1 });
postSchema.index({ content: 'text' });

export const Post = mongoose.model<IPost>('Post', postSchema);
