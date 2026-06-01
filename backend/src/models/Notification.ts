import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'friend_request'
  | 'friend_accept'
  | 'post_like'
  | 'post_comment'
  | 'comment_reply'
  | 'post_share'
  | 'post_tag'
  | 'mention'
  | 'story_view'
  | 'message';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: NotificationType;
  entityId?: mongoose.Types.ObjectId;
  entityType?: 'post' | 'comment' | 'message' | 'story';
  message: string;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['friend_request', 'friend_accept', 'post_like', 'post_comment', 'comment_reply', 'post_share', 'post_tag', 'mention', 'story_view', 'message'],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId },
    entityType: { type: String, enum: ['post', 'comment', 'message', 'story'] },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
