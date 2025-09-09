import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getFollowingUsers, getFollowers, FollowingUser, Follower } from '../services/followService';
import { supabase } from '../supabaseClient';

interface FollowContextType {
  followedUsers: FollowingUser[];
  followers: Follower[];
  refreshFollowData: () => Promise<void>;
  addFollowedUser: (user: FollowingUser) => void;
  removeFollowedUser: (userId: string) => void;
  addFollower: (follower: Follower) => void;
  removeFollower: (followerId: string) => void;
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);

export const FollowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [followedUsers, setFollowedUsers] = useState<FollowingUser[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const refreshFollowData = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const [followingData, followersData] = await Promise.all([
        getFollowingUsers(currentUserId),
        getFollowers(currentUserId),
      ]);
      setFollowedUsers(followingData);
      setFollowers(followersData);
      queryClient.invalidateQueries({ queryKey: ['followCounts', currentUserId] });
    } catch (error) {
      console.error('Failed to refresh follow data:', error);
    }
  }, [currentUserId, queryClient]);

  useEffect(() => {
    refreshFollowData();
  }, [refreshFollowData]);

  const addFollowedUser = useCallback((user: FollowingUser) => {
    setFollowedUsers((prev) => [...prev, user]);
  }, []);

  const removeFollowedUser = useCallback((userId: string) => {
    setFollowedUsers((prev) => prev.filter((u) => u.followed_user_id !== userId));
  }, []);

  const addFollower = useCallback((follower: Follower) => {
    setFollowers((prev) => [...prev, follower]);
  }, []);

  const removeFollower = useCallback((followerId: string) => {
    setFollowers((prev) => prev.filter((f) => f.follower_id !== followerId));
  }, []);

  return (
    <FollowContext.Provider
      value={{
        followedUsers,
        followers,
        refreshFollowData,
        addFollowedUser,
        removeFollowedUser,
        addFollower,
        removeFollower,
      }}
    >
      {children}
    </FollowContext.Provider>
  );
};

export const useFollow = () => {
  const context = useContext(FollowContext);
  if (context === undefined) {
    throw new Error('useFollow must be used within a FollowProvider');
  }
  return context;
};
