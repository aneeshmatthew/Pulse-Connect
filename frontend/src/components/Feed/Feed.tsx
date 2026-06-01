import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Wifi } from 'lucide-react';
import { GET_FEED, NEW_POST_SUB } from '@/lib/graphql';
import { PostCard } from '@/components/Post/PostCard';
import { CreatePost } from '@/components/Post/CreatePost';
import { StoriesBar } from '@/components/Stories/StoriesBar';
import { PostSkeleton } from '@/components/UI/Skeleton';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

const LIMIT = 10;

export function Feed() {
  const { isAuthenticated } = useAuthStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const loadingMore = useRef(false);

  const { data, loading, fetchMore, refetch } = useQuery(GET_FEED, {
    variables: { limit: LIMIT },
    skip: !isAuthenticated,
    notifyOnNetworkStatusChange: true,
  });

  // New-post subscription — show banner, don't auto-insert (avoid layout thrash)
  useSubscription(NEW_POST_SUB, {
    skip: !isAuthenticated,
    onData: () => setHasNewPosts(true),
  });

  const posts: any[] = data?.feed?.posts ?? [];
  const hasMore: boolean = data?.feed?.hasMore ?? false;
  const nextCursor: string | null = data?.feed?.nextCursor ?? null;

  const handleRefresh = useCallback(async () => {
    setHasNewPosts(false);
    await refetch({ cursor: undefined, limit: LIMIT });
    parentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [refetch]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMore.current || !nextCursor) return;
    loadingMore.current = true;
    try {
      await fetchMore({ variables: { cursor: nextCursor, limit: LIMIT } });
    } finally {
      loadingMore.current = false;
    }
  }, [hasMore, loading, nextCursor, fetchMore]);

  const totalCount = posts.length + (loading && !posts.length ? LIMIT : 0);

  const rowVirtualizer = useVirtualizer({
    count: totalCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 440,
    overscan: 3,
    measureElement: (el) => el?.getBoundingClientRect().height ?? 440,
  });

  // Infinite scroll: trigger fetchMore when last visible item is near the end
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (!virtualItems.length) return;
    const lastVisible = virtualItems[virtualItems.length - 1];
    if (lastVisible.index >= posts.length - 3 && hasMore && !loading) {
      handleLoadMore();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowVirtualizer.getVirtualItems().length, posts.length, hasMore, loading]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] gap-0">
      {/* Fixed header section — Stories + Composer */}
      <div className="flex-shrink-0 space-y-3 pb-3">
        <div className="bg-white dark:bg-surface-dark-2 rounded-xl shadow-card dark:shadow-card-dark p-4">
          <StoriesBar />
        </div>
        <CreatePost />
      </div>

      {/* New posts banner */}
      <AnimatePresence>
        {hasNewPosts && (
          <motion.button
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            onClick={handleRefresh}
            className="flex-shrink-0 flex items-center justify-center gap-2 py-2.5 mb-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
          >
            <RefreshCw size={15} />
            New posts — click to refresh
          </motion.button>
        )}
      </AnimatePresence>

      {/* Virtualized scroll area */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as any}
      >
        {/* Empty state */}
        {!loading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
            <Wifi size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium">Your feed is empty</p>
            <p className="text-sm mt-1">Follow people or add friends to see posts here</p>
          </div>
        )}

        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const post = posts[virtualItem.index];
            const isPlaceholder = !post;

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                  paddingBottom: '12px',
                }}
              >
                {isPlaceholder ? (
                  <PostSkeleton />
                ) : (
                  <PostCard key={post.id} post={post} />
                )}
              </div>
            );
          })}
        </div>

        {!hasMore && posts.length > 0 && (
          <p className="text-center py-8 text-sm text-gray-400 dark:text-gray-500 select-none">
            You're all caught up 🎉
          </p>
        )}
      </div>
    </div>
  );
}
