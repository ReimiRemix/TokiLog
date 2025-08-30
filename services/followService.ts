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