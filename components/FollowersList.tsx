import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './icons/LoadingSpinner';
import { Session } from '@supabase/supabase-js';
import { getFollowers, Follower } from '../services/followService'; // Import the new service

interface FollowersListProps {
  onSelectUser: (userId: string) => void;
}

const FollowersList: React.FC<FollowersListProps> = ({ onSelectUser }) => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    getSession();
  }, []);

  const { data: followers, isLoading, error } = useQuery<Follower[]> ({
    queryKey: ['followers', session?.user?.id],
    queryFn: async ({ queryKey }) => {
      const [, userId] = queryKey;
      if (!userId) throw new Error("User not authenticated.");
      return getFollowers(userId);
    },
    enabled: !!session?.user,
  });

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
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">フォロワー</h2>
      <div className="space-y-3">
        {followers.map((follower) => (
          <div
            key={follower.follower_id}
            className="flex items-center justify-between bg-light-card dark:bg-dark-card p-3 rounded-md shadow-sm border border-light-border dark:border-dark-border"
          >
            <div
              className="flex-grow cursor-pointer"
              onClick={() => onSelectUser(follower.follower_id)}
            >
              <p className="font-semibold text-light-text dark:text-dark-text">
                {follower.follower_display_name || follower.follower_username}
              </p>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                @{follower.follower_username}
              </p>
            </div>
            {/* Add a "Follow Back" or "Unfollow" button here if needed */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FollowersList;
