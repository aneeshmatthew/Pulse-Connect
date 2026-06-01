import mongoose, { Document, Schema } from 'mongoose';

export interface IStory extends Document {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  media: {
    url: string;
    type: 'image' | 'video';
    duration?: number;
    thumbnail?: string;
  };
  text?: string;
  textStyle?: {
    color: string;
    fontSize: number;
    fontFamily: string;
    position: { x: number; y: number };
  };
  backgroundColor?: string;
  gradient?: string[];
  views: { user: mongoose.Types.ObjectId; viewedAt: Date }[];
  reactions: { user: mongoose.Types.ObjectId; emoji: string; createdAt: Date }[];
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
}

const storySchema = new Schema<IStory>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    media: {
      url: { type: String, required: true },
      type: { type: String, enum: ['image', 'video'], required: true },
      duration: Number,
      thumbnail: String,
    },
    text: String,
    textStyle: {
      color: String,
      fontSize: Number,
      fontFamily: String,
      position: { x: Number, y: Number },
    },
    backgroundColor: String,
    gradient: [String],
    views: [{
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      viewedAt: { type: Date, default: Date.now },
    }],
    reactions: [{
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      emoji: String,
      createdAt: { type: Date, default: Date.now },
    }],
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

storySchema.index({ author: 1, isActive: 1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Story = mongoose.model<IStory>('Story', storySchema);
