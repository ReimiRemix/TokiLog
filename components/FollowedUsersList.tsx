import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './icons/LoadingSpinner';
import { Session } from '@supabase/supabase-js';
import { unfollowUser, getFollowers, Follower } from '../services/followService';
import { blockUser } from '../services/blockService';
import ConfirmationModal from './ConfirmationModal';

interface FollowedUser {
  followed_id: string;
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

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();
  }, []);

  const { data: followedUsers, isLoading: isLoadingFollowed, error: errorFollowed } = useQuery<FollowedUser[]>({
    queryKey: ['followedUsers', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) throw new Error("User not authenticated.");

      const { data: followData, error: followError } = await supabase
        .from('follow_relationships')
        .select('followed_id')
        .eq('follower_id', session.user.id)
        .eq('status', 'accepted');

      if (followError) throw followError;
      if (!followData || followData.length === 0) return [];

      const followedIds = followData.map(item => item.followed_id);

      const { data: userProfilesData, error: userProfilesError } = await supabase
        .from('user_profiles')
        .select('id, username, display_name')
        .in('id', followedIds);

      if (userProfilesError) throw userProfilesError;

      const userProfilesMap = new Map(userProfilesData.map(profile => [profile.id, profile]));

      return followData.map((item: any) => {
        const userProfile = userProfilesMap.get(item.followed_id);
        return {
          followed_id: item.followed_id,
          followed_username: userProfile?.username || 'Unknown',
          followed_display_name: userProfile?.display_name || 'Unknown User',
        };
      });
    },
    enabled: !!session?.user,
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followedUsers'] });
      setUserToUnfollow(null);
      alert('フォローを解除しました。');
    },
    onError: (err: any) => {
      alert('フォロー解除に失敗しました: ' + err.message);
    },
  });

  const blockMutation = useMutation({
    mutationFn: blockUser,
    onSuccess: () => {
      setUserToBlock(null);
      queryClient.invalidateQueries({ queryKey: ['followedUsers'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      alert('ユーザーをブロックしました。');
    },
    onError: (error) => {
      alert(`ブロックに失敗しました: ${error.message}`);
    },
  });

  const handleConfirmUnfollow = () => {
    if (userToUnfollow) {
      unfollowMutation.mutate(userToUnfollow.followed_id);
    }
  };

  const handleConfirmBlock = () => {
    if (userToBlock) {
      blockMutation.mutate(userToBlock.followed_id);
    }
  };

  const isLoading = isLoadingFollowed || isLoadingFollowers;
  const error = errorFollowed || errorFollowers;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingSpinner />
        <span className="ml-2 text-light-text dark:text-dark-text">フォロー中のユーザーを読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">エラー: {error.message}</div>;
  }

  if (!followedUsers || followedUsers.length === 0) {
    return <div className="text-light-text-secondary dark:text-dark-text-secondary p-4 text-center">フォロー中のユーザーはいません。</div>;
  }

  return (
    <>
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">フォロー中のユーザー</h2>
        <div className="space-y-3">
          {followedUsers.map((user) => {
            const isMutual = followerIds.has(user.followed_id);
            return (
              <div
                key={user.followed_id}
                className="flex items-center justify-between bg-light-card dark:bg-dark-card p-3 rounded-md shadow-sm border border-light-border dark:border-dark-border"
              >
                <div
                  className="flex-grow cursor-pointer"
                  onClick={() => onSelectUser(user.followed_id)}
                >
                  <p className="font-semibold text-light-text dark:text-dark-text">
                    {user.followed_display_name || user.followed_username}
                  </p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    @{user.followed_username}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isMutual && (
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded-full">
                          相互フォロー
                      </span>
                  )}
                  <button
                    onClick={() => setUserToUnfollow(user)}
                    disabled={unfollowMutation.isPending}
                    className="bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-md text-sm hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    フォロー解除
                  </button>
                  <button
                    onClick={() => setUserToBlock(user)}
                    disabled={blockMutation.isPending}
                    className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ブロック
                  </button>
                </div>
              </div>
            )
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
