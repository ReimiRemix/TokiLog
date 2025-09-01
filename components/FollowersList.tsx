import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './icons/LoadingSpinner';
import { Session } from '@supabase/supabase-js';
import { getFollowers, Follower, getFollowingUsers, FollowingUser, getSentFollowRequests, SentFollowRequest } from '../services/followService';
import { blockUser } from '../services/blockService';
import ConfirmationModal from './ConfirmationModal';

interface FollowersListProps {
  onSelectUser: (userId: string) => void;
}

const FollowersList: React.FC<FollowersListProps> = ({ onSelectUser }) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [userToBlock, setUserToBlock] = useState<Follower | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();
  }, []);

  const { data: followers, isLoading: isLoadingFollowers, error: errorFollowers } = useQuery<Follower[]> ({
    queryKey: ['followers', session?.user?.id],
    queryFn: async ({ queryKey }) => {
      const [, userId] = queryKey;
      if (!userId) throw new Error("User not authenticated.");
      return getFollowers(userId as string);
    },
    enabled: !!session?.user,
  });

  const { data: following, isLoading: isLoadingFollowing, error: errorFollowing } = useQuery<FollowingUser[]>({
    queryKey: ['following', session?.user?.id],
    queryFn: async ({ queryKey }) => {
      const [, userId] = queryKey;
      if (!userId) throw new Error("User not authenticated.");
      return getFollowingUsers(userId as string);
    },
    enabled: !!session?.user,
  });

  const { data: sentRequests, isLoading: isLoadingSentRequests } = useQuery<SentFollowRequest[]>({
    queryKey: ['sentFollowRequests', session?.user?.id],
    queryFn: getSentFollowRequests,
    enabled: !!session?.user,
  });

  const blockMutation = useMutation({
    mutationFn: blockUser,
    onSuccess: () => {
      alert('ユーザーをブロックしました。');
      setUserToBlock(null);
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
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
        alert('フォローリクエストを送信しました！');
    },
    onError: (error) => {
        alert(`フォローリクエストの送信に失敗しました: ${error.message}`);
    }
  });

  const followingIds = useMemo(() => {
    if (!following) return new Set<string>();
    return new Set(following.map(u => u.followed_user_id));
  }, [following]);

  const sentRequestIds = useMemo(() => {
    if (!sentRequests) return new Set<string>();
    return new Set(sentRequests.map(r => r.addressee_id));
  }, [sentRequests]);

  const handleConfirmBlock = () => {
    if (userToBlock) {
      blockMutation.mutate(userToBlock.follower_id);
    }
  };

  const isLoading = isLoadingFollowers || isLoadingFollowing || isLoadingSentRequests;
  const error = errorFollowers || errorFollowing;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingSpinner />
        <span className="ml-2 text-light-text dark:text-dark-text">フォロワーを読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">エラー: {error.message}</div>;
  }

  if (!followers || followers.length === 0) {
    return <div className="text-light-text-secondary dark:text-dark-text-secondary p-4 text-center">フォロワーはいません。</div>;
  }

  return (
    <>
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">フォロワー</h2>
        <div className="space-y-3">
          {followers.map((follower) => {
            const isMutual = followingIds.has(follower.follower_id);
            const hasSentRequest = sentRequestIds.has(follower.follower_id);

            return (
              <div
                key={follower.follower_id}
                className="flex items-center justify-between bg-light-card dark:bg-dark-card p-3 rounded-md shadow-sm border border-light-border dark:border-dark-border"
              >
                <div
                  className={`flex-grow ${isMutual ? 'cursor-pointer' : 'cursor-default'}`}
                  onClick={() => isMutual && onSelectUser(follower.follower_id)}
                >
                  <p className={`font-semibold text-light-text dark:text-dark-text`}>
                    {follower.follower_display_name || follower.follower_username}
                  </p>
                  <p className={`text-sm text-light-text-secondary dark:text-dark-text-secondary`}>
                    @{follower.follower_username}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  {isMutual ? (
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full">
                      相互フォロー
                    </span>
                  ) : (
                    <button 
                        onClick={() => sendFollowRequestMutation.mutate(follower.follower_id)}
                        disabled={sendFollowRequestMutation.isPending || hasSentRequest}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {hasSentRequest ? 'リクエスト済み' : 'フォローバック'}
                    </button>
                  )}
                  <button 
                    onClick={() => setUserToBlock(follower)}
                    className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-semibold"
                  >
                    ブロック
                  </button>
                </div>
              </div>
            )
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
