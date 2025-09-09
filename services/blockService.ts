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
  console.log('[DEBUG] blockUser: blockedUserId received:', blockedUserId);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated.");

  const blockerId = user.id;

  // 既存のフォロー関係を両方向から削除
  const { error: deleteError } = await supabase
    .from('follow_relationships')
    .delete()
    .or(`and(follower_id.eq.${blockerId},followed_id.eq.${blockedUserId}),and(follower_id.eq.${blockedUserId},followed_id.eq.${blockerId})`);

  if (deleteError) {
    console.error('Error deleting follow relationships during block:', deleteError);
    throw new Error(`フォロー関係の削除に失敗しました: ${deleteError.message}`);
  }

  // ブロックリストに登録 (既にあれば何もしない)
  const { error: insertError } = await supabase
    .from('blocked_users')
    .insert({ blocker_id: blockerId, blocked_id: blockedUserId })
    .select(); // Use select() to get data back if needed, or just for consistency

  if (insertError) {
    console.error('Error inserting into blocked_users:', insertError);
    throw new Error(`ブロックリストへの追加に失敗しました: ${insertError.message}`);
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
