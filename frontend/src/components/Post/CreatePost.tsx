import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Smile, MapPin, X, Globe, Users, Lock, Loader2 } from 'lucide-react';
import { CREATE_POST, GET_FEED } from '@/lib/graphql';
import { Avatar } from '@/components/UI/Avatar';
import { useAuthStore } from '@/store';
import { cn } from '@/utils';
import toast from 'react-hot-toast';

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC',  label: 'Public',   icon: Globe,  desc: 'Anyone can see this' },
  { value: 'FRIENDS', label: 'Friends',  icon: Users,  desc: 'Your friends only' },
  { value: 'PRIVATE', label: 'Only me',  icon: Lock,   desc: 'Just you' },
];

const FEELINGS = [
  '😊 happy', '😍 loved', '😎 cool', '🤔 thoughtful',
  '🥳 celebrating', '😴 tired', '💪 motivated', '🙏 grateful',
];

export function CreatePost() {
  const { user } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [feeling, setFeeling] = useState('');
  const [location, setLocation] = useState('');
  const [showVisibility, setShowVisibility] = useState(false);
  const [showFeelings, setShowFeelings] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [createPost, { loading }] = useMutation(CREATE_POST, {
    update(cache, { data }) {
      const newPost = data?.createPost;
      if (!newPost) return;
      // Prepend to feed cache
      const existing = cache.readQuery<any>({ query: GET_FEED, variables: { limit: 10 } });
      if (existing) {
        cache.writeQuery({
          query: GET_FEED,
          variables: { limit: 10 },
          data: {
            feed: {
              ...existing.feed,
              posts: [newPost, ...(existing.feed?.posts ?? [])],
              total: (existing.feed?.total ?? 0) + 1,
            },
          },
        });
      }
    },
  });

  const handleExpand = useCallback(() => {
    setExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const handleReset = useCallback(() => {
    setContent('');
    setFeeling('');
    setLocation('');
    setExpanded(false);
    setShowFeelings(false);
    setShowVisibility(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || loading) return;
    try {
      await createPost({
        variables: {
          input: {
            content: content.trim(),
            visibility,
            feeling: feeling || undefined,
            location: location.trim() || undefined,
          },
        },
      });
      handleReset();
      toast.success('Post shared!');
    } catch (err: any) {
      toast.error(err?.graphQLErrors?.[0]?.message ?? 'Failed to create post');
    }
  }, [content, visibility, feeling, location, loading, createPost, handleReset]);

  const canSubmit = content.trim().length > 0 && !loading;
  const charCount = content.length;
  const charLimit = 63206;
  const visOpt = VISIBILITY_OPTIONS.find((v) => v.value === visibility)!;
  const VisIcon = visOpt.icon;

  return (
    <div className="bg-white dark:bg-surface-dark-2 rounded-xl shadow-card dark:shadow-card-dark p-4">
      {/* Collapsed trigger */}
      <div className="flex items-center gap-3">
        <Avatar src={user?.avatar} name={user?.fullName ?? 'User'} size="md" />
        <button
          onClick={handleExpand}
          className="flex-1 bg-gray-100 dark:bg-surface-dark-3 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full px-4 py-2.5 text-left text-sm text-gray-400 transition-colors"
        >
          What's on your mind, {user?.firstName}?
        </button>
      </div>

      {/* Expanded composer */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-3 overflow-hidden"
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= charLimit) {
                  setContent(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }
              }}
              placeholder={`What's on your mind, ${user?.firstName}?`}
              rows={3}
              maxLength={charLimit}
              className="w-full bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 outline-none resize-none text-lg leading-relaxed min-h-[72px]"
            />

            {/* Char counter */}
            {charCount > charLimit * 0.8 && (
              <p className={cn(
                'text-xs text-right mt-1 tabular-nums',
                charCount > charLimit * 0.95 ? 'text-red-500' : 'text-gray-400'
              )}>
                {charLimit - charCount} remaining
              </p>
            )}

            {/* Tags */}
            {(feeling || location) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {feeling && (
                  <span className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-brand-500 text-sm rounded-full px-3 py-1">
                    {feeling}
                    <button onClick={() => setFeeling('')} aria-label="Remove feeling">
                      <X size={12} />
                    </button>
                  </span>
                )}
                {location && (
                  <span className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 text-sm rounded-full px-3 py-1">
                    <MapPin size={11} />{location}
                    <button onClick={() => setLocation('')} aria-label="Remove location">
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Feelings picker */}
            <AnimatePresence>
              {showFeelings && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-2 grid grid-cols-2 gap-1 bg-gray-50 dark:bg-surface-dark-3 rounded-xl p-2"
                >
                  {FEELINGS.map((f) => (
                    <button
                      key={f}
                      onClick={() => { setFeeling(f); setShowFeelings(false); }}
                      className="text-left text-sm px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-surface-dark-2 transition-colors"
                    >
                      {f}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media / action bar */}
      <div className={cn(
        'flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700',
        !expanded && 'border-t-0 pt-0'
      )}>
        <div className="flex items-center gap-0.5">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-dark-3 text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors">
            <Image size={18} className="text-green-500" />
            <span className="hidden sm:inline">Photo/Video</span>
          </button>
          <button
            onClick={() => { setShowFeelings((v) => !v); if (!expanded) setExpanded(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-dark-3 text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors"
          >
            <Smile size={18} className="text-yellow-500" />
            <span className="hidden sm:inline">Feeling</span>
          </button>
          <button
            onClick={() => {
              const loc = window.prompt('Enter your location:');
              if (loc?.trim()) { setLocation(loc.trim()); if (!expanded) setExpanded(true); }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-dark-3 text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors"
          >
            <MapPin size={18} className="text-red-500" />
            <span className="hidden sm:inline">Check in</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Visibility picker */}
          <div className="relative">
            <button
              onClick={() => setShowVisibility((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-surface-dark-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
            >
              <VisIcon size={13} />
              <span>{visOpt.label}</span>
            </button>
            <AnimatePresence>
              {showVisibility && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 bottom-full mb-2 w-52 bg-white dark:bg-surface-dark-2 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-10"
                >
                  {VISIBILITY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = visibility === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => { setVisibility(opt.value); setShowVisibility(false); }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-surface-dark-3 transition-colors text-left',
                          isSelected && 'bg-blue-50/70 dark:bg-blue-900/20'
                        )}
                      >
                        <Icon size={17} className={isSelected ? 'text-brand-500' : 'text-gray-500'} />
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{opt.label}</p>
                          <p className="text-xs text-gray-500">{opt.desc}</p>
                        </div>
                        {isSelected && <span className="ml-auto text-brand-500 text-xs">✓</span>}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {expanded && (
            <>
              <button
                onClick={handleReset}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-dark-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Post
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
