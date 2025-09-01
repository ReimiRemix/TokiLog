import { supabase } from '../supabaseClient';

export interface BlockedUser {
  blocked_user_id: string;
  blocked_username: string;
  blocked_display_name: string | null;
}

/**
 * Blocks a user.
 * This will call an RPC function `block_user` which should handle:
 * 1. Creating a record in the `blocked_users` table.
 * 2. Removing any existing follow relationships in both directions.
 */
export const blockUser = async (blockedUserId: string): Promise<void> => {
  const { error } = await supabase.rpc('block_user', { p_blocked_user_id: blockedUserId });
  if (error) {
    console.error('Error blocking user:', error);
    throw new Error(`ユーザーのブロックに失敗しました: ${error.message}`);
  }
};

/**
 * Unblocks a user.
 */
export const unblockUser = async (blockedUserId: string): Promise<void> => {
  const { error } = await supabase.rpc('unblock_user', { p_blocked_user_id: blockedUserId });
  if (error) {
    console.error('Error unblocking user:', error);
    throw new Error(`ユーザーのブロック解除に失敗しました: ${error.message}`);
  }
};

/**
 * Fetches a list of users blocked by the current user.
 */
export const getBlockedUsers = async (): Promise<BlockedUser[]> => {
  const { data, error } = await supabase.rpc('get_blocked_users');
  if (error) {
    console.error('Error fetching blocked users:', error);
    throw new Error(`ブロックリストの取得に失敗しました: ${error.message}`);
  }
  return data as BlockedUser[];
};
