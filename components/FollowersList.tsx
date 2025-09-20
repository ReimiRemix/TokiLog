import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './icons/LoadingSpinner';
import { Session } from '@supabase/supabase-js';
import { getFollowers, Follower, getSentFollowRequests, SentFollowRequest } from '../services/followService';
import { blockUser } from '../services/blockService';
import ConfirmationModal from './ConfirmationModal';
import { useFollow } from '../contexts/FollowContext';
import UserCard from './UserCard';
import type { UserProfile } from '../types';
import LockIcon from './icons/LockIcon';
import PlusIcon from './icons/PlusIcon';
import ClockIcon from './icons/ClockIcon';
import PlusIcon from './icons/PlusIcon';
import ClockIcon from './icons/ClockIcon';

interface FollowersListProps {
  onSelectUser: (userId: string) => void;
}

const FollowersList: React.FC<FollowersListProps> = ({ onSelectUser }) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [userToBlock, setUserToBlock] = useState<Follower | null>(null);

  const { followers, followedUsers, refreshFollowData, removeFollower } = useFollow();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      refreshFollowData();
    }
  }, [session?.user?.id, refreshFollowData]);

  const { data: sentRequests, isLoading: isLoadingSentRequests } = useQuery<SentFollowRequest[]>({
    queryKey: ['sentFollowRequests', session?.user?.id],
    queryFn: getSentFollowRequests,
    enabled: !!session?.user,
  });

  const blockMutation = useMutation({
    mutationFn: blockUser,
    onSuccess: (data, variables) => {
      removeFollower(variables);
      refreshFollowData();
      setUserToBlock(null);
      alert('ユーザーをブロックしました。');
    },
    onError: (error) => {
      alert(`ブロックに失敗しました: ${error.message}`);
    },
  });

  const sendFollowRequestMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
        if (!session?.user) throw new Error("User not authenticated.");
        const { error } = await supabase.from('follow_relationships').insert({
            follower_id: session.user.id,
            followed_id: targetUserId,
            status: 'pending'
        });
        if (error) throw error;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['sentFollowRequests'] });
        refreshFollowData();
        alert('フォローリクエストを送信しました！');
    },
    onError: (error) => {
        alert(`フォローリクエストの送信に失敗しました: ${error.message}`);
    }
  });

  const followingIds = useMemo(() => {
    if (!followedUsers) return new Set<string>();
    return new Set(followedUsers.map(u => u.followed_user_id));
  }, [followedUsers]);

  const sentRequestIds = useMemo(() => {
    if (!sentRequests) return new Set<string>();
    return new Set(sentRequests.map(r => r.addressee_id));
  }, [sentRequests]);

  const handleConfirmBlock = () => {
    if (userToBlock) {
      blockMutation.mutate(userToBlock.follower_id);
    }
  };

  const isLoading = !followers || !followedUsers || isLoadingSentRequests;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner />
        <span className="ml-2 text-light-text dark:text-dark-text">フォロワーを読み込み中...</span>
      </div>
    );
  }

  if (followers.length === 0) {
    return <div className="text-light-text-secondary dark:text-dark-text-secondary p-8 text-center">フォロワーはいません。</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text px-4">フォロワー</h2>
        <div className="space-y-3">
          {followers.map((follower) => {
            const isMutual = followingIds.has(follower.follower_id);
            const hasSentRequest = sentRequestIds.has(follower.follower_id);

            const userProfile: UserProfile = {
              id: follower.follower_id,
              username: follower.follower_username,
              display_name: follower.follower_display_name,
              avatar_url: '', // Not available
              is_super_admin: false, // Not available
            };

            return (
              <UserCard key={userProfile.id} user={userProfile} onClick={isMutual ? onSelectUser : undefined} isMutual={isMutual}>
                {isMutual ? (
                  null // Rendered inside UserCard now
                ) : (
                  <button 
                      onClick={(e) => { e.stopPropagation(); sendFollowRequestMutation.mutate(follower.follower_id); }}
                      disabled={sendFollowRequestMutation.isPending || hasSentRequest}
                      className="text-sm font-semibold bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                      isActionButton={true} // Mark as action button
                  >
                      {hasSentRequest ? <ClockIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                      <span>{hasSentRequest ? 'リクエスト済み' : 'フォローバック'}</span>
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); setUserToBlock(follower); }}
                  className="bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 disabled:opacity-50"
                  disabled={blockMutation.isPending}
                  isActionButton={true} // Mark as action button
                >
                  <LockIcon className="w-4 h-4" />
                  <span>ブロック</span>
                </button>
              </UserCard>
            );
          })}
        </div>
      </div>

      {userToBlock && (
        <ConfirmationModal
          isOpen={!!userToBlock}
          onClose={() => setUserToBlock(null)}
          onConfirm={handleConfirmBlock}
          title={`${userToBlock.follower_display_name || userToBlock.follower_username}さんをブロック`}
          confirmText="ブロック"
          isDestructive
        >
          <p>本当にこのユーザーをブロックしますか？</p>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">
            ブロックすると、相手はあなたをフォローできなくなり、あなたのお気に入りも見れなくなります。既存のフォロー関係は両方とも解除されます。
          </p>
        </ConfirmationModal>
      )}
    </>
  );
};

export default FollowersList;