import { supabase } from '../supabaseClient';

// --- TYPE DEFINITIONS ---

export interface Follower {
  follower_id: string;
  follower_username: string;
  follower_display_name: string | null;
}

export interface FollowingUser {
  followed_user_id: string;
  followed_username: string;
  followed_display_name: string | null;
}

export interface PendingFollowRequest {
  request_id: string; // This is the 'id' from the follow_relationships table
  follower_id: string;
  follower_username: string;
  follower_display_name: string | null;
  created_at: string;
}

export interface SentFollowRequest {
  request_id: string; // This is the 'id' from the follow_relationships table
  addressee_id: string; // This is the 'followed_id'
  addressee_username: string;
  addressee_display_name: string | null;
  created_at: string;
}


// --- SERVICE FUNCTIONS ---

/**
 * [DEPRECATED - USES RPC] Fetches followers for a given user.
 * Kept for components that have not been migrated yet.
 */
export const getFollowers = async (userId: string): Promise<Follower[]> => {
  const { data, error } = await supabase.rpc('get_followers', { p_user_id: userId });
  if (error) {
    throw new Error(`フォロワーの取得に失敗しました: ${error.message}`);
  }
  return data as Follower[];
};

/**
 * Fetches users a given user is following by querying the table directly.
 */
export const getFollowingUsers = async (userId: string): Promise<FollowingUser[]> => {
  const { data: relationships, error: relationshipError } = await supabase
    .from('follow_relationships')
    .select('followed_id')
    .eq('follower_id', userId)
    .eq('status', 'accepted');

  if (relationshipError) {
    console.error("Error fetching following relationships:", relationshipError);
    throw new Error(`フォロー中のユーザーの取得に失敗しました: ${relationshipError.message}`);
  }
  if (!relationships || relationships.length === 0) {
    return [];
  }

  const followedIds = relationships.map(r => r.followed_id);
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, username, display_name')
    .in('id', followedIds);

  if (profileError) {
    console.error("Error fetching profiles for following users:", profileError);
    throw new Error(`ユーザープロフィールの取得に失敗しました: ${profileError.message}`);
  }

  return profiles.map(p => ({
    followed_user_id: p.id,
    followed_username: p.username || '不明なユーザー',
    followed_display_name: p.display_name || null,
  }));
};


/**
 * Fetches pending follow requests received by the current user.
 * Bypasses RPC and queries the table directly for reliability.
 */
export const getPendingFollowRequests = async (): Promise<PendingFollowRequest[]> => {
  // --- DEBUG LOGGING START ---
  console.log('[getPendingFollowRequests] Starting...');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('[getPendingFollowRequests] Error getting user or user not found.', userError);
    return [];
  }
  console.log(`[getPendingFollowRequests] Fetching requests for user ID: ${user.id}`);
  // --- DEBUG LOGGING END ---

  const { data: requests, error: requestError } = await supabase
    .from('follow_relationships')
    .select('id, created_at, follower_id')
    .eq('followed_id', user.id)
    .eq('status', 'pending');

  // --- DEBUG LOGGING START ---
  if (requestError) {
    console.error("[getPendingFollowRequests] Error fetching from 'follow_relationships':", requestError);
  }
  console.log("[getPendingFollowRequests] Raw requests from DB:", requests);
  // --- DEBUG LOGGING END ---

  if (requestError) {
    throw new Error(`保留中のリクエストの取得に失敗しました: ${requestError.message}`);
  }
  if (!requests || requests.length === 0) {
    return [];
  }

  const followerIds = requests.map(r => r.follower_id);
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, username, display_name')
    .in('id', followerIds);

  if (profileError) {
    console.error("Error fetching profiles for pending requests:", profileError);
    throw new Error(`ユーザープロフィールの取得に失敗しました: ${profileError.message}`);
  }

  const profilesMap = new Map(profiles.map(p => [p.id, p]));
  const finalData = requests.map(r => {
    const profile = profilesMap.get(r.follower_id);
    return {
      request_id: r.id,
      follower_id: r.follower_id,
      follower_username: profile?.username || '不明なユーザー',
      follower_display_name: profile?.display_name || null,
      created_at: r.created_at,
    };
  });

  // --- DEBUG LOGGING START ---
  console.log("[getPendingFollowRequests] Final combined data:", finalData);
  // --- DEBUG LOGGING END ---

  return finalData;
};

/**
 * Fetches pending follow requests sent by the current user.
 * Bypasses RPC and queries the table directly for reliability.
 */
export const getSentFollowRequests = async (): Promise<SentFollowRequest[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: requests, error: requestError } = await supabase
    .from('follow_relationships')
    .select('id, created_at, followed_id')
    .eq('follower_id', user.id)
    .eq('status', 'pending');

  if (requestError) {
    console.error("Error fetching sent requests:", requestError);
    throw new Error(`送信済みリクエストの取得に失敗しました: ${requestError.message}`);
  }
  if (!requests || requests.length === 0) {
    return [];
  }

  const addresseeIds = requests.map(r => r.followed_id);
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, username, display_name')
    .in('id', addresseeIds);

  if (profileError) {
    console.error("Error fetching profiles for sent requests:", profileError);
    throw new Error(`ユーザープロフィールの取得に失敗しました: ${profileError.message}`);
  }

  const profilesMap = new Map(profiles.map(p => [p.id, p]));
  return requests.map(r => {
    const profile = profilesMap.get(r.followed_id);
    return {
      request_id: r.id,
      addressee_id: r.followed_id,
      addressee_username: profile?.username || '不明なユーザー',
      addressee_display_name: profile?.display_name || null,
      created_at: r.created_at,
    };
  });
};

/**
 * Unfollows a user.
 */
export const unfollowUser = async (followedUserId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated.");

  const { error } = await supabase
    .from('follow_relationships')
    .delete()
    .eq('follower_id', user.id)
    .eq('followed_id', followedUserId);

  if (error) {
    console.error("Error unfollowing user:", error);
    throw new Error(`フォロー解除に失敗しました: ${error.message}`);
  }
};

/**
 * Fetches the number of followers for a given user.
 */
export const getFollowersCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('follow_relationships')
    .select('*', { count: 'exact', head: true })
    .eq('followed_id', userId)
    .eq('status', 'accepted');

  if (error) {
    console.error("Error fetching followers count:", error);
    throw new Error(`フォロワー数の取得に失敗しました: ${error.message}`);
  }

  return count || 0;
};

/**
 * Fetches the number of users a given user is following.
 */
export const getFollowingCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('follow_relationships')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId)
    .eq('status', 'accepted');

  if (error) {
    console.error("Error fetching following count:", error);
    throw new Error(`フォロー数の取得に失敗しました: ${error.message}`);
  }

  return count || 0;
};