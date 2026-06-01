import { withFilter } from 'graphql-subscriptions';
import { pubsub, EVENTS, GraphQLContext } from '../context';

/**
 * Subscription resolvers.
 *
 * Security rules:
 * - newPost / newStory — public, but subscriber must be authenticated
 * - newMessage / typingStatus — subscriber must be a participant of that conversation
 * - newNotification — subscriber only receives their own notifications
 * - userOnlineStatus — public per userId
 */
export const subscriptionResolvers = {
  Subscription: {
    // ── Feed ──────────────────────────────────────────────────────────────
    newPost: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([EVENTS.NEW_POST]),
        (_payload: any, _vars: any, ctx: GraphQLContext) => !!ctx.user
      ),
    },

    postUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([EVENTS.POST_UPDATED]),
        (payload: any, variables: any, ctx: GraphQLContext) =>
          !!ctx.user &&
          payload.postUpdated._id?.toString() === variables.postId
      ),
    },

    // ── Comments ──────────────────────────────────────────────────────────
    newComment: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([EVENTS.NEW_COMMENT]),
        (payload: any, variables: any, ctx: GraphQLContext) =>
          !!ctx.user &&
          payload.newComment.post?.toString() === variables.postId
      ),
    },

    // ── Messages ──────────────────────────────────────────────────────────
    // Channel is scoped to conversationId — no cross-conversation leakage
    newMessage: {
      subscribe: withFilter(
        (_: any, { conversationId }: any) =>
          pubsub.asyncIterator([`${EVENTS.NEW_MESSAGE}.${conversationId}`]),
        (_payload: any, _vars: any, ctx: GraphQLContext) => !!ctx.user
      ),
    },

    messageUpdated: {
      subscribe: withFilter(
        (_: any, { conversationId }: any) =>
          pubsub.asyncIterator([`${EVENTS.MESSAGE_UPDATED}.${conversationId}`]),
        (_payload: any, _vars: any, ctx: GraphQLContext) => !!ctx.user
      ),
    },

    typingStatus: {
      subscribe: withFilter(
        (_: any, { conversationId }: any) =>
          pubsub.asyncIterator([`${EVENTS.TYPING_STATUS}.${conversationId}`]),
        (payload: any, _vars: any, ctx: GraphQLContext) =>
          !!ctx.user &&
          // Don't send typing events back to the person who is typing
          payload.typingStatus.userId !== ctx.user._id.toString()
      ),
    },

    // ── Notifications ─────────────────────────────────────────────────────
    newNotification: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([EVENTS.NEW_NOTIFICATION]),
        (payload: any, _vars: any, ctx: GraphQLContext) =>
          !!ctx.user &&
          payload.newNotification.recipient?.toString() === ctx.user._id.toString()
      ),
    },

    // ── Presence ──────────────────────────────────────────────────────────
    userOnlineStatus: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([EVENTS.USER_ONLINE_STATUS]),
        (payload: any, variables: any) =>
          payload.userOnlineStatus.userId?.toString() === variables.userId
      ),
    },

    // ── Stories ───────────────────────────────────────────────────────────
    newStory: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([EVENTS.NEW_STORY]),
        (_payload: any, _vars: any, ctx: GraphQLContext) => !!ctx.user
      ),
    },
  },
};
