import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './icons/LoadingSpinner';
import { Session } from '@supabase/supabase-js';
import { unfollowUser, getFollowers, Follower } from '../services/followService';
import { blockUser } from '../services/blockService';
import ConfirmationModal from './ConfirmationModal';
import { useFollow } from '../contexts/FollowContext';
import UserCard from './UserCard';
import type { UserProfile } from '../types';

interface FollowedUser {
  followed_user_id: string;
  followed_username: string;
  followed_display_name: string | null;
}

interface FollowedUsersListProps {
  onSelectUser: (userId: string) => void;
}

const FollowedUsersList: React.FC<FollowedUsersListProps> = ({ onSelectUser }) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [userToUnfollow, setUserToUnfollow] = useState<FollowedUser | null>(null);
  const [userToBlock, setUserToBlock] = useState<FollowedUser | null>(null);

  const { followedUsers, refreshFollowData, removeFollowedUser } = useFollow();

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

  const { data: followers, isLoading: isLoadingFollowers, error: errorFollowers } = useQuery<Follower[]> ({
    queryKey: ['followers', session?.user?.id],
    queryFn: async ({ queryKey }) => {
      const [, userId] = queryKey;
      if (!userId) throw new Error("User not authenticated.");
      return getFollowers(userId as string);
    },
    enabled: !!session?.user,
  });

  const followerIds = useMemo(() => {
    if (!followers) return new Set<string>();
    return new Set(followers.map(f => f.follower_id));
  }, [followers]);

  const unfollowMutation = useMutation({
    mutationFn: unfollowUser,
    onSuccess: (data, variables) => {
      removeFollowedUser(variables);
      refreshFollowData(); // Refresh followers list as well
      setUserToUnfollow(null);
      alert('フォローを解除しました。');
    },
    onError: (err: any) => {
      alert('フォロー解除に失敗しました: ' + err.message);
    },
  });

  const blockMutation = useMutation({
    mutationFn: blockUser,
    onSuccess: (data, variables) => {
      removeFollowedUser(variables);
      refreshFollowData(); // Refresh followers list as well
      setUserToBlock(null);
      alert('ユーザーをブロックしました。');
    },
    onError: (error) => {
      alert(`ブロックに失敗しました: ${error.message}`);
    },
  });

  const handleConfirmUnfollow = () => {
    if (userToUnfollow) {
      unfollowMutation.mutate(userToUnfollow.followed_user_id);
    }
  };

  const handleConfirmBlock = () => {
    if (userToBlock) {
      blockMutation.mutate(userToBlock.followed_user_id);
    }
  };

  const isLoading = !followedUsers || isLoadingFollowers;
  const error = errorFollowers;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner />
        <span className="ml-2 text-light-text dark:text-dark-text">フォロー中のユーザーを読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4 text-center bg-red-100 dark:bg-red-900/50 rounded-lg">エラー: {error.message}</div>;
  }

  if (followedUsers.length === 0) {
    return <div className="text-light-text-secondary dark:text-dark-text-secondary p-8 text-center">フォロー中のユーザーはいません。</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text px-4">フォロー中のユーザー</h2>
        <div className="space-y-3">
          {followedUsers.map((user) => {
            const isMutual = followerIds.has(user.followed_user_id);
            
            // Normalize the user data to UserProfile format
            const userProfile: UserProfile = {
              id: user.followed_user_id,
              username: user.followed_username,
              display_name: user.followed_display_name,
              avatar_url: '', // Not available in this context
              is_super_admin: false, // Not available in this context
            };

            return (
              <UserCard key={userProfile.id} user={userProfile} onClick={onSelectUser}>
                {isMutual && (
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full">
                    相互フォロー
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setUserToUnfollow(user); }}
                  disabled={unfollowMutation.isPending}
                  className="bg-slate-200 dark:bg-slate-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  フォロー解除
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setUserToBlock(user); }}
                  disabled={blockMutation.isPending}
                  className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ブロック
                </button>
              </UserCard>
            );
          })}
        </div>
      </div>

      {userToUnfollow && (
        <ConfirmationModal
          isOpen={!!userToUnfollow}
          onClose={() => setUserToUnfollow(null)}
          onConfirm={handleConfirmUnfollow}
          title="フォロー解除の確認"
          confirmText="フォロー解除"
        >
          <p><strong>{userToUnfollow.followed_display_name || userToUnfollow.followed_username}</strong>さんのフォローを本当に解除しますか？</p>
        </ConfirmationModal>
      )}

      {userToBlock && (
        <ConfirmationModal
          isOpen={!!userToBlock}
          onClose={() => setUserToBlock(null)}
          onConfirm={handleConfirmBlock}
          title={`${userToBlock.followed_display_name || userToBlock.followed_username}さんをブロック`}
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

export default FollowedUsersList;