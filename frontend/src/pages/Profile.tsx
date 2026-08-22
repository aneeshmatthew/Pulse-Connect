import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import {
  MapPin, Link2, Calendar, UserPlus, UserCheck, MessageCircle, Edit2,
} from 'lucide-react';
import {
  GET_USER, GET_USER_POSTS,
  SEND_FRIEND_REQUEST, ACCEPT_FRIEND_REQUEST,
} from '@/lib/graphql';
import { Avatar } from '@/components/UI/Avatar';
import { PostCard } from '@/components/Post/PostCard';
import { PostSkeleton } from '@/components/UI/Skeleton';
import { AppLayout } from './Home';
import { useAuthStore, useUIStore } from '@/store';
import { formatDate, cn } from '@/utils';
import toast from 'react-hot-toast';

const TABS = ['Posts', 'About', 'Friends', 'Photos'] as const;
type Tab = typeof TABS[number];

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: me } = useAuthStore();
  const { openChat } = useUIStore();
  const [activeTab, setActiveTab] = useState<Tab>('Posts');
  const [friendReqSent, setFriendReqSent] = useState(false);

  const { data: userData, loading: userLoading } = useQuery(GET_USER, {
    variables: { username },
    skip: !username,
  });

  const { data: postsData, loading: postsLoading, fetchMore } = useQuery(GET_USER_POSTS, {
    variables: { userId: userData?.user?.id, limit: 10 },
    skip: !userData?.user?.id || activeTab !== 'Posts',
  });

  const [sendRequest, { loading: sendingReq }] = useMutation(SEND_FRIEND_REQUEST, {
    refetchQueries: ['GetUser'],
  });
  const [acceptRequest, { loading: acceptingReq }] = useMutation(ACCEPT_FRIEND_REQUEST, {
    refetchQueries: ['GetUser'],
  });

  const profile = userData?.user;
  const posts: any[] = postsData?.userPosts?.posts ?? [];
  const hasMore: boolean = postsData?.userPosts?.hasMore ?? false;
  const nextCursor: string | null = postsData?.userPosts?.nextCursor ?? null;
  const isOwner = me?.id === profile?.id;

  const handleFriendAction = async () => {
    if (!profile || sendingReq || acceptingReq) return;
    try {
      if (profile.hasFriendRequest) {
        await acceptRequest({ variables: { userId: profile.id } });
        toast.success('You are now friends! 🎉');
      } else {
        await sendRequest({ variables: { userId: profile.id } });
        setFriendReqSent(true);
        toast.success('Friend request sent!');
      }
    } catch (err: any) {
      toast.error(err?.graphQLErrors?.[0]?.message ?? 'Action failed');
    }
  };

  if (userLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <div className="bg-white dark:bg-surface-dark-2 rounded-xl shadow-card overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-200 dark:bg-gray-700" />
            <div className="p-6 space-y-3">
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
          <PostSkeleton />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="bg-white dark:bg-surface-dark-2 rounded-xl shadow-card p-12 text-center">
          <p className="text-xl font-semibold text-gray-900 dark:text-white">User not found</p>
          <p className="text-gray-500 mt-2">The profile @{username} doesn't exist.</p>
        </div>
      </AppLayout>
    );
  }

  const isFriendRequested = friendReqSent || profile.hasFriendRequest;

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* ── Cover + profile header ─────────────────────────────────── */}
        <div className="bg-white dark:bg-surface-dark-2 rounded-xl shadow-card overflow-hidden">
          {/* Cover */}
          <div className="h-52 relative bg-gradient-to-br from-brand-500 via-purple-500 to-pink-500">
            {profile.coverPhoto && (
              <img src={profile.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
            )}
            {isOwner && (
              <button className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-black/60 text-xs font-semibold text-gray-800 dark:text-white rounded-lg shadow hover:bg-white transition-colors">
                <Edit2 size={12} /> Edit cover photo
              </button>
            )}
          </div>

          <div className="px-6 pb-0">
            {/* Avatar row */}
            <div className="flex items-end justify-between -mt-14 mb-3">
              <div className="relative">
                <div className="inline-flex rounded-full border-4 border-white dark:border-surface-dark-2 overflow-hidden ring-2 ring-gray-100 dark:ring-gray-700">
                  <Avatar src={profile.avatar} name={profile.fullName} size="xl" />
                </div>
                {profile.isOnline && (
                  <span className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-surface-dark-2" />
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pb-1">
                {isOwner ? (
                  <button className="flex items-center gap-2 px-5 py-2 bg-gray-100 dark:bg-surface-dark-3 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors text-gray-800 dark:text-white">
                    <Edit2 size={15} /> Edit profile
                  </button>
                ) : (
                  <>
                    {!profile.isFriend && (
                      <button
                        onClick={handleFriendAction}
                        disabled={sendingReq || acceptingReq || isFriendRequested}
                        className={cn(
                          'flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-60',
                          isFriendRequested
                            ? 'bg-gray-100 dark:bg-surface-dark-3 text-gray-600 dark:text-gray-300'
                            : 'bg-brand-500 hover:bg-brand-600 text-white'
                        )}
                      >
                        <UserPlus size={15} />
                        {isFriendRequested ? 'Request Sent' : profile.hasFriendRequest ? 'Accept Request' : 'Add Friend'}
                      </button>
                    )}
                    {profile.isFriend && (
                      <button className="flex items-center gap-2 px-5 py-2 bg-gray-100 dark:bg-surface-dark-3 text-sm font-semibold rounded-xl text-gray-800 dark:text-white">
                        <UserCheck size={15} className="text-green-500" /> Friends
                      </button>
                    )}
                    <button
                      onClick={() => openChat(profile.id)}
                      className="flex items-center gap-2 px-5 py-2 bg-gray-100 dark:bg-surface-dark-3 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors text-gray-800 dark:text-white"
                    >
                      <MessageCircle size={15} /> Message
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Profile info */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 leading-tight">
              {profile.fullName}
              {profile.isVerified && <span className="text-brand-500 text-lg" title="Verified">✓</span>}
            </h1>
            {profile.bio && (
              <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm leading-relaxed">{profile.bio}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span>
                <strong className="text-gray-900 dark:text-white">{profile.friendsCount?.toLocaleString()}</strong> friends
              </span>
              {profile.location && (
                <span className="flex items-center gap-1"><MapPin size={13} />{profile.location}</span>
              )}
              {profile.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-brand-500 hover:underline"
                >
                  <Link2 size={13} />{profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {profile.createdAt && (
                <span className="flex items-center gap-1">
                  <Calendar size={13} />Joined {formatDate(profile.createdAt)}
                </span>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-0 mt-4 border-t border-gray-100 dark:border-gray-700 -mx-6 px-4">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'relative px-4 py-3 text-sm font-semibold transition-colors',
                    activeTab === tab
                      ? 'text-brand-500'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-surface-dark-3 rounded-t-xl'
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="profile-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand-500 rounded-t-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tab content ───────────────────────────────────────────── */}
        {activeTab === 'Posts' && (
          <div className="space-y-4">
            {postsLoading && <PostSkeleton />}
            {!postsLoading && posts.length === 0 && (
              <div className="bg-white dark:bg-surface-dark-2 rounded-xl shadow-card p-10 text-center text-gray-400">
                <p className="text-lg font-medium">No posts yet</p>
                {isOwner && <p className="text-sm mt-1">Share your first post!</p>}
              </div>
            )}
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
            {hasMore && nextCursor && (
              <button
                onClick={() => fetchMore({ variables: { cursor: nextCursor, limit: 10 } })}
                className="w-full py-3 text-sm font-semibold text-brand-500 hover:text-brand-600 hover:underline"
              >
                Load more posts
              </button>
            )}
          </div>
        )}

        {activeTab === 'About' && (
          <div className="bg-white dark:bg-surface-dark-2 rounded-xl shadow-card p-6 space-y-5">
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">About</h2>
            {!profile.bio && !profile.location && !profile.website ? (
              <p className="text-gray-400 text-sm">No info to show.</p>
            ) : (
              <>
                {profile.bio && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Bio</p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">{profile.bio}</p>
                  </div>
                )}
                {profile.location && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Lives in</p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 flex items-center gap-1">
                      <MapPin size={13} /> {profile.location}
                    </p>
                  </div>
                )}
                {profile.website && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Website</p>
                    <a
                      href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-500 hover:underline flex items-center gap-1"
                    >
                      <Link2 size={13} /> {profile.website}
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'Friends' && (
          <div className="bg-white dark:bg-surface-dark-2 rounded-xl shadow-card p-6">
            <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-4">
              Friends <span className="text-gray-400 font-normal text-base">({profile.friendsCount})</span>
            </h2>
            {!profile.friends?.length ? (
              <p className="text-gray-400 text-sm">No friends to show.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {profile.friends.map((friend: any) => (
                  <button
                    key={friend.id}
                    onClick={() => window.location.assign(`/profile/${friend.username}`)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-surface-dark-3 transition-colors"
                  >
                    <Avatar src={friend.avatar} name={friend.fullName} size="lg" isOnline={friend.isOnline} />
                    <span className="text-xs font-medium text-center text-gray-900 dark:text-white line-clamp-1 w-full">
                      {friend.firstName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Photos' && (
          <div className="bg-white dark:bg-surface-dark-2 rounded-xl shadow-card p-6">
            <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-4">Photos</h2>
            <p className="text-gray-400 text-sm">Photos from posts will appear here.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
