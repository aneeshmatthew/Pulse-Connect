import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { Search, Send, Phone, Video, Info, Edit, ArrowLeft, MessageCircle } from 'lucide-react';
import {
  GET_CONVERSATIONS, GET_MESSAGES, SEND_MESSAGE,
  NEW_MESSAGE_SUB, TYPING_STATUS_SUB, SET_TYPING, MARK_CONVERSATION_READ,
} from '@/lib/graphql';
import { subscriptionsEnabled, POLL_INTERVAL_MS } from '@/lib/apollo';
import { Avatar } from '@/components/UI/Avatar';
import { AppLayout } from './Home';
import { useAuthStore } from '@/store';
import { formatMessageTime, timeAgo, cn } from '@/utils';

export function MessagesPage() {
  const { user } = useAuthStore();
  const { conversationId: paramConvId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  const [activeConvId, setActiveConvId] = useState<string | null>(paramConvId ?? null);
  const [text, setText] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const [searchText, setSearchText] = useState('');

  const parentRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const { data: convsData } = useQuery(GET_CONVERSATIONS, {
    skip: !user,
    pollInterval: subscriptionsEnabled ? 0 : POLL_INTERVAL_MS.conversationsList,
  });
  const { data: msgsData } = useQuery(GET_MESSAGES, {
    variables: { conversationId: activeConvId, limit: 50 },
    skip: !activeConvId,
    // Fallback for deployments without a WebSocket-capable backend (e.g.
    // Vercel): re-poll for new messages every few seconds. Safe to merge —
    // `messages` is cached per-conversationId and dedupes by ref.
    pollInterval: subscriptionsEnabled ? 0 : POLL_INTERVAL_MS.chatMessages,
  });

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE, {
    update(cache, { data }) {
      const newMsg = data?.sendMessage;
      if (!newMsg || !activeConvId) return;
      cache.updateQuery(
        { query: GET_MESSAGES, variables: { conversationId: activeConvId, limit: 50 } },
        (existing) => {
          if (!existing) return { messages: [newMsg] };
          const exists = existing.messages.some((m: any) => m.id === newMsg.id);
          return exists ? existing : { messages: [...existing.messages, newMsg] };
        }
      );
    },
    refetchQueries: [GET_CONVERSATIONS],
  });

  const [setTypingMutation] = useMutation(SET_TYPING);
  const [markRead] = useMutation(MARK_CONVERSATION_READ);

  useSubscription(NEW_MESSAGE_SUB, {
    variables: { conversationId: activeConvId! },
    skip: !activeConvId || !subscriptionsEnabled,
    onData: ({ client, data }) => {
      const newMsg = data.data?.newMessage;
      if (!newMsg || !activeConvId) return;
      client.cache.updateQuery(
        { query: GET_MESSAGES, variables: { conversationId: activeConvId, limit: 50 } },
        (existing) => {
          if (!existing) return { messages: [newMsg] };
          const exists = existing.messages.some((m: any) => m.id === newMsg.id);
          return exists ? existing : { messages: [...existing.messages, newMsg] };
        }
      );
      markRead({ variables: { conversationId: activeConvId } });
    },
  });

  useSubscription(TYPING_STATUS_SUB, {
    variables: { conversationId: activeConvId! },
    skip: !activeConvId || !subscriptionsEnabled,
    onData: ({ data }) => {
      const s = data.data?.typingStatus;
      if (s && s.userId !== user?.id) {
        setOtherTyping(s.isTyping);
        if (s.isTyping) setTimeout(() => setOtherTyping(false), 3000);
      }
    },
  });

  // Mark as read when entering conversation
  useEffect(() => {
    if (activeConvId) markRead({ variables: { conversationId: activeConvId } });
  }, [activeConvId]);

  const conversations = convsData?.conversations ?? [];
  const messages: any[] = msgsData?.messages ?? [];

  // ✅ Fix: find OTHER participant using user.id
  const activeConv = conversations.find((c: any) => c.id === activeConvId);
  const otherParticipant = activeConv?.participants?.find((p: any) => p.id !== user?.id)
    ?? activeConv?.participants?.[0];

  const rowVirtualizer = useVirtualizer({
    count: messages.length + (otherTyping ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
    measureElement: (el) => el?.getBoundingClientRect().height ?? 56,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, activeConvId]);

  const stopTyping = useCallback(() => {
    if (isTypingRef.current && activeConvId) {
      isTypingRef.current = false;
      setTypingMutation({ variables: { conversationId: activeConvId, isTyping: false } });
    }
  }, [activeConvId, setTypingMutation]);

  const handleTyping = useCallback(() => {
    if (!activeConvId) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setTypingMutation({ variables: { conversationId: activeConvId, isTyping: true } });
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 2000);
  }, [activeConvId, setTypingMutation, stopTyping]);

  useEffect(() => () => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    stopTyping();
  }, [stopTyping]);

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content || !activeConvId || sending) return;
    setText('');
    stopTyping();
    try {
      await sendMessage({ variables: { input: { conversationId: activeConvId, content } } });
    } catch {
      setText(content);
    }
  }, [text, activeConvId, sending, sendMessage, stopTyping]);

  const handleSelectConv = useCallback((id: string) => {
    setActiveConvId(id);
    setOtherTyping(false);
    setText('');
  }, []);

  const filteredConvs = conversations.filter((c: any) => {
    if (!searchText.trim()) return true;
    const other = c.participants?.find((p: any) => p.id !== user?.id) ?? c.participants?.[0];
    return other?.fullName?.toLowerCase().includes(searchText.toLowerCase());
  });

  return (
    <AppLayout>
      <div className="bg-white dark:bg-surface-dark-2 rounded-xl shadow-card overflow-hidden flex"
        style={{ height: 'calc(100vh - 88px)' }}>

        {/* ── Conversation list ───────────────────────────────────────── */}
        <div className={cn(
          'w-full md:w-80 flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-gray-700',
          activeConvId ? 'hidden md:flex' : 'flex'
        )}>
          <div className="p-4 flex-shrink-0 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Chats</h1>
              <button aria-label="New message" className="w-8 h-8 rounded-full bg-gray-100 dark:bg-surface-dark-3 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <Edit size={14} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-surface-dark-3 rounded-full px-3 py-2">
              <Search size={14} className="text-gray-400" aria-hidden />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search Messenger"
                className="bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder:text-gray-400 flex-1"
              />
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto">
            {filteredConvs.length === 0 && (
              <li className="p-6 text-center text-sm text-gray-400">No conversations found</li>
            )}
            {filteredConvs.map((conv: any) => {
              const other = conv.participants?.find((p: any) => p.id !== user?.id) ?? conv.participants?.[0];
              const isActive = conv.id === activeConvId;
              const lastMsgText = conv.lastMessage?.isDeleted
                ? 'Message deleted'
                : conv.lastMessage?.content || 'No messages yet';

              return (
                <li key={conv.id}>
                  <button
                    onClick={() => handleSelectConv(conv.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-surface-dark-3 transition-colors text-left',
                      isActive && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <Avatar src={other?.avatar} name={other?.fullName ?? '?'} size="md" isOnline={other?.isOnline} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {conv.isGroup ? conv.groupName : other?.fullName}
                        </span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                          {timeAgo(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className={cn(
                        'text-xs truncate mt-0.5',
                        conv.unreadCount > 0
                          ? 'font-semibold text-gray-900 dark:text-white'
                          : 'text-gray-500'
                      )}>
                        {conv.isTyping ? <span className="text-brand-500">typing…</span> : lastMsgText}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── Chat area ───────────────────────────────────────────────── */}
        {activeConvId && otherParticipant ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={() => setActiveConvId(null)}
                className="md:hidden text-brand-500 mr-1"
                aria-label="Back to conversations"
              >
                <ArrowLeft size={20} />
              </button>
              <Avatar src={otherParticipant.avatar} name={otherParticipant.fullName} size="md" isOnline={otherParticipant.isOnline} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate">{otherParticipant.fullName}</p>
                <p className="text-xs text-gray-500">
                  {otherTyping
                    ? <span className="text-brand-500 font-medium">typing…</span>
                    : otherParticipant.isOnline ? 'Active now' : 'Offline'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button aria-label="Voice call" className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-surface-dark-3 flex items-center justify-center text-brand-500">
                  <Phone size={18} />
                </button>
                <button aria-label="Video call" className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-surface-dark-3 flex items-center justify-center text-brand-500">
                  <Video size={18} />
                </button>
                <button aria-label="Conversation info" className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-surface-dark-3 flex items-center justify-center text-brand-500">
                  <Info size={18} />
                </button>
              </div>
            </div>

            {/* Virtualized messages */}
            <div ref={parentRef} className="flex-1 overflow-y-auto px-4 py-2">
              <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', minHeight: '100%' }}>
                {rowVirtualizer.getVirtualItems().map((vItem) => {
                  const isTypingSlot = vItem.index === messages.length && otherTyping;
                  const msg = messages[vItem.index];

                  return (
                    <div
                      key={vItem.key}
                      data-index={vItem.index}
                      ref={rowVirtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        width: '100%',
                        transform: `translateY(${vItem.start}px)`,
                        paddingBottom: '4px',
                      }}
                    >
                      {isTypingSlot ? (
                        <div className="flex items-end gap-2 pb-1">
                          <Avatar src={otherParticipant.avatar} name={otherParticipant.fullName} size="xs" />
                          <div className="bg-gray-100 dark:bg-surface-dark-3 rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1 items-center">
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: `${i * 0.15}s` }}
                              />
                            ))}
                          </div>
                        </div>
                      ) : msg ? (
                        <div
                          className={cn(
                            'flex items-end gap-2 group',
                            msg.sender?.id === user?.id ? 'flex-row-reverse' : 'flex-row'
                          )}
                        >
                          {msg.sender?.id !== user?.id && (
                            <Avatar src={otherParticipant.avatar} name={otherParticipant.fullName} size="xs" />
                          )}
                          <div className={cn(
                            'max-w-[65%] flex flex-col',
                            msg.sender?.id === user?.id ? 'items-end' : 'items-start'
                          )}>
                            <div className={cn(
                              'px-4 py-2.5 rounded-2xl text-sm break-words',
                              msg.sender?.id === user?.id
                                ? 'bg-brand-500 text-white rounded-br-sm'
                                : 'bg-gray-100 dark:bg-surface-dark-3 text-gray-900 dark:text-white rounded-bl-sm',
                              msg.isDeleted && 'italic opacity-60'
                            )}>
                              {msg.isDeleted ? 'This message was deleted' : msg.content}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
              <div className="flex-1 flex items-center bg-gray-100 dark:bg-surface-dark-3 rounded-full px-4 py-2.5">
                <input
                  value={text}
                  onChange={(e) => { setText(e.target.value); handleTyping(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Aa"
                  maxLength={20000}
                  className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                aria-label="Send"
                className="w-10 h-10 rounded-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-3 text-gray-400">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-surface-dark-3 flex items-center justify-center">
              <MessageCircle size={32} className="opacity-50" />
            </div>
            <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">Your Messages</p>
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
