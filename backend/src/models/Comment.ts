import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  media?: { url: string; type: 'image' | 'gif' };
  reactions: { user: mongoose.Types.ObjectId; type: string; createdAt: Date }[];
  replies: mongoose.Types.ObjectId[];
  parentComment?: mongoose.Types.ObjectId;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 8000 },
    media: {
      url: String,
      type: { type: String, enum: ['image', 'gif'] },
    },
    reactions: [{
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      type: { type: String, enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'] },
      createdAt: { type: Date, default: Date.now },
    }],
    replies: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    parentComment: { type: Schema.Types.ObjectId, ref: 'Comment' },
    isEdited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: 1 });
commentSchema.index({ parentComment: 1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
