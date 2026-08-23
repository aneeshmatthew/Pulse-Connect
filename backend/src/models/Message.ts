import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  media?: { url: string; type: 'image' | 'video' | 'file'; name?: string; size?: number };
  reactions: { user: mongoose.Types.ObjectId; emoji: string }[];
  readBy: { user: mongoose.Types.ObjectId; readAt: Date }[];
  isEdited: boolean;
  isDeleted: boolean;
  replyTo?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  groupAdmin?: mongoose.Types.ObjectId;
  lastMessage?: mongoose.Types.ObjectId;
  lastMessageAt: Date;
  unreadCount: Map<string, number>;
  isTyping: Map<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, maxlength: 20000, default: '' },
    // Mongoose defaults single-nested subdocuments (the `{ url: String, ... }`
    // shorthand below) to an empty object `{}` on every document, even when
    // `media` is never set — so a plain text message ends up with
    // `media: { url: undefined, ... }` instead of `media: undefined`. GraphQL
    // then sees a real (non-null) `media` object and throws trying to resolve
    // `MessageMedia.url: String!` against `undefined`. Wrapping it as an
    // explicit sub-schema with `default: undefined` is the standard fix —
    // it stops Mongoose from auto-instantiating the empty object at all.
    media: {
      type: new Schema({
        url: String,
        type: { type: String, enum: ['image', 'video', 'file'] },
        name: String,
        size: Number,
      }, { _id: false }),
      default: undefined,
    },
    reactions: [{
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      emoji: String,
    }],
    readBy: [{
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      readAt: { type: Date, default: Date.now },
    }],
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
  },
  { timestamps: true }
);

const conversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    isGroup: { type: Boolean, default: false },
    groupName: String,
    groupAvatar: String,
    groupAdmin: { type: Schema.Types.ObjectId, ref: 'User' },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date, default: Date.now },
    unreadCount: { type: Map, of: Number, default: {} },
    isTyping: { type: Map, of: Boolean, default: {} },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
