import mongoose, { Document, Schema } from 'mongoose';

export interface IMedia {
  url: string;
  type: 'image' | 'video' | 'gif';
  thumbnail?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface IReaction {
  user: mongoose.Types.ObjectId;
  type: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';
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
  visibility: 'public' | 'friends' | 'private';
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

const mediaSchema = new Schema<IMedia>(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video', 'gif'], required: true },
    thumbnail: String,
    width: Number,
    height: Number,
    duration: Number,
  },
  { _id: false } // ✅ no _id on sub-docs that don't need independent querying
);

const reactionSchema = new Schema<IReaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'], required: true },
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
    visibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    tags: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    location: { type: String, maxlength: 200 },
    feeling: { type: String, maxlength: 100 },
    isPinned: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    editHistory: [{ content: { type: String }, editedAt: { type: Date } }],
    viewCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
// Compound index — the primary feed query pattern: filter by author + sort by date
postSchema.index({ author: 1, createdAt: -1 });
// Public explore feed
postSchema.index({ visibility: 1, createdAt: -1 });
// Full-text search on post content
postSchema.index({ content: 'text' });

export const Post = mongoose.model<IPost>('Post', postSchema);
