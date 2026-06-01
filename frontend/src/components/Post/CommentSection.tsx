import { useState, useCallback, memo } from 'react';
import { useMutation } from '@apollo/client';
import { Send, Smile, CornerDownRight } from 'lucide-react';
import { CREATE_COMMENT } from '@/lib/graphql';
import { Avatar } from '@/components/UI/Avatar';
import { useAuthStore } from '@/store';
import { timeAgo, cn } from '@/utils';
import toast from 'react-hot-toast';

interface CommentProps {
  comment: any;
  postId: string;
  depth?: number;
}

const Comment = memo(function Comment({ comment, postId, depth = 0 }: CommentProps) {
  const { user } = useAuthStore();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(false);

  const [createComment, { loading }] = useMutation(CREATE_COMMENT, {
    update(cache, { data }) {
      // Optimistically append reply to local state
    },
  });

  const handleReply = useCallback(async () => {
    const content = replyText.trim();
    if (!content || loading) return;
    try {
      await createComment({
        variables: { input: { postId, content, parentCommentId: comment.id } },
      });
      setReplyText('');
      setShowReply(false);
      setShowReplies(true);
    } catch (err: any) {
      toast.error(err?.graphQLErrors?.[0]?.message ?? 'Failed to reply');
    }
  }, [replyText, loading, createComment, postId, comment.id]);

  return (
    <div className={cn('flex gap-2', depth > 0 && 'ml-10 mt-2')}>
      <Avatar src={comment.author.avatar} name={comment.author.fullName} size="sm" />
      <div className="flex-1 min-w-0">
        {/* Bubble */}
        <div className="bg-gray-100 dark:bg-surface-dark-3 rounded-2xl px-3 py-2 inline-block max-w-full">
          <span className="font-semibold text-xs text-gray-900 dark:text-white">{comment.author.fullName}</span>
          {comment.isEdited && <span className="text-[10px] text-gray-400 ml-1">(edited)</span>}
          <p className="text-sm text-gray-800 dark:text-gray-200 break-words mt-0.5">{comment.content}</p>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-1 ml-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{timeAgo(comment.createdAt)}</span>
          <button className="font-semibold hover:text-brand-500 transition-colors">Like</button>
          {depth === 0 && (
            <button
              onClick={() => setShowReply((v) => !v)}
              className="font-semibold hover:text-brand-500 transition-colors flex items-center gap-0.5"
            >
              <CornerDownRight size={11} /> Reply
            </button>
          )}
          {comment.repliesCount > 0 && depth === 0 && (
            <button
              onClick={() => setShowReplies((v) => !v)}
              className="font-semibold hover:text-brand-500 transition-colors"
            >
              {showReplies ? 'Hide replies' : `${comment.repliesCount} repl${comment.repliesCount === 1 ? 'y' : 'ies'}`}
            </button>
          )}
        </div>

        {/* Reply input */}
        {showReply && user && (
          <div className="flex items-center gap-2 mt-2">
            <Avatar src={user.avatar} name={user.fullName} size="xs" />
            <div className="flex-1 flex items-center bg-gray-100 dark:bg-surface-dark-3 rounded-full px-3 py-1.5 gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                placeholder={`Reply to ${comment.author.firstName}…`}
                maxLength={8000}
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || loading}
                className="text-brand-500 disabled:opacity-40"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {showReplies && comment.replies?.map((reply: any) => (
          <Comment key={reply.id} comment={reply} postId={postId} depth={depth + 1} />
        ))}
      </div>
    </div>
  );
});

interface CommentSectionProps {
  postId: string;
  initialComments?: any[];
}

export function CommentSection({ postId, initialComments = [] }: CommentSectionProps) {
  const { user } = useAuthStore();
  const [text, setText] = useState('');

  const [createComment, { loading }] = useMutation(CREATE_COMMENT, {
    update(cache, { data }) {
      const newComment = data?.createComment;
      if (!newComment) return;
      // Comments are managed by the parent post's comments field — refetch handles this
    },
    refetchQueries: ['GetPost'],
  });

  const handleSubmit = useCallback(async () => {
    const content = text.trim();
    if (!content || !user || loading) return;
    try {
      await createComment({ variables: { input: { postId, content } } });
      setText('');
    } catch (err: any) {
      toast.error(err?.graphQLErrors?.[0]?.message ?? 'Failed to post comment');
    }
  }, [text, user, loading, createComment, postId]);

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Composer */}
      {user && (
        <div className="flex items-center gap-2">
          <Avatar src={user.avatar} name={user.fullName} size="sm" />
          <div className="flex-1 flex items-center bg-gray-100 dark:bg-surface-dark-3 rounded-full px-4 py-2 gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Write a comment…"
              maxLength={8000}
              className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
            />
            <button className="text-gray-400 hover:text-brand-500 transition-colors" aria-label="Add emoji">
              <Smile size={15} />
            </button>
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || loading}
              className="text-brand-500 disabled:opacity-40 transition-opacity"
              aria-label="Post comment"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="space-y-3">
        {initialComments.map((c) => (
          <Comment key={c.id} comment={c} postId={postId} />
        ))}
      </div>
    </div>
  );
}

