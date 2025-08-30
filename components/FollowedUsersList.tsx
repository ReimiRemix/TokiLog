import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './icons/LoadingSpinner';
import { Session } from '@supabase/supabase-js';

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

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();
  }, []);

  const { data: followedUsers, isLoading, error } = useQuery<FollowedUser[]>({
    queryKey: ['followedUsers'],
    queryFn: async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error("User not authenticated.");

      // Step 1: Fetch followed_id from follow_relationships
      const { data: followData, error: followError } = await supabase
        .from('follow_relationships')
        .select('followed_id') // Only select followed_id
        .eq('follower_id', session.user.id)
        .eq('status', 'accepted');

      if (followError) {
        throw followError;
      }

      if (!followData || followData.length === 0) {
        return []; // No followed users
      }

      // Extract all followed_ids
      const followedIds = followData.map(item => item.followed_id);

      // Step 2: Query user_profiles separately using the fetched followed_ids
      const { data: userProfilesData, error: userProfilesError } = await supabase
        .from('user_profiles')
        .select('id, username, display_name')
        .in('id', followedIds); // Use .in() to fetch multiple profiles

      if (userProfilesError) {
        throw userProfilesError;
      }

      // Create a map for quick lookup of user profiles by ID
      const userProfilesMap = new Map(userProfilesData.map(profile => [profile.id, profile]));

      // Step 3: Manually combine the data
      return followData.map((item: any) => {
        const userProfile = userProfilesMap.get(item.followed_id);
        if (!userProfile) {
          // Handle cases where a followed_id might not have a corresponding user_profile (shouldn't happen if FK is enforced)
          return {
            followed_id: item.followed_id,
            followed_username: 'Unknown',
            followed_display_name: 'Unknown User',
          };
        }
        return {
          followed_id: item.followed_id,
          followed_username: userProfile.username,
          followed_display_name: userProfile.display_name,
        };
      });
    },
    enabled: !!session?.user,
  });

  const unfollowMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.rpc('unfollow_user', { p_target_user_id: targetUserId });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followedUsers'] });
      alert('フォローを解除しました。');
    },
    onError: (err: any) => {
      console.error('Error unfollowing user:', err);
      alert('フォロー解除に失敗しました: ' + err.message);
    },
  });

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
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">フォロー中のユーザー</h2>
      <div className="space-y-3">
        {followedUsers.map((user) => (
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
            <button
              onClick={() => unfollowMutation.mutate(user.followed_id)}
              disabled={unfollowMutation.isPending}
              className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              アンフォロー
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FollowedUsersList;
