import { supabase } from '../supabaseClient';

export interface Follower {
  follower_id: string;
  follower_username: string;
  follower_display_name: string | null;
}

export const getFollowers = async (userId: string): Promise<Follower[]> => {
  const { data, error } = await supabase.rpc('get_followers', { p_user_id: userId });

  if (error) {
    throw new Error(`フォロワーの取得に失敗しました: ${error.message}`);
  }

  return data as Follower[];
};

export interface FollowingUser {
  followed_user_id: string;
}

export const getFollowingUsers = async (userId: string): Promise<FollowingUser[]> => {
  console.log("getFollowingUsers: Calling RPC with user ID:", userId);
  const { data, error } = await supabase.rpc('get_following_users', { p_user_id: userId });

  if (error) {
    console.error("getFollowingUsers: RPC error:", error);
    throw new Error(`フォロー中のユーザーの取得に失敗しました: ${error.message}`);
  }

  console.log("getFollowingUsers: RPC successful, data:", data);
  return data as FollowingUser[];
};