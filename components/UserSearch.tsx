import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './icons/LoadingSpinner';
import SearchIcon from './icons/SearchIcon';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@supabase/supabase-js';
import { getFollowingUsers, getSentFollowRequests } from '../services/followService';
import type { SentFollowRequest } from '../services/followService';

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
}

interface ReceivedFollowRequest {
  request_id: string;
  follower_id: string;
}

interface UserSearchProps {
  user: User;
}

const UserSearch: React.FC<UserSearchProps> = ({ user: currentUser }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);

  const { data: followingUsers = [], isLoading: isLoadingFollowing } = useQuery({
    queryKey: ['followingUsers', currentUser?.id],
    queryFn: () => getFollowingUsers(currentUser!.id),
    enabled: !!currentUser?.id,
  });

  const { data: sentRequests = [], isLoading: isLoadingSentRequests } = useQuery<SentFollowRequest[]>({
    queryKey: ['sentFollowRequests', currentUser?.id],
    queryFn: getSentFollowRequests,
    enabled: !!currentUser,
  });

  const isFollowing = (targetUserId: string) => {
    return followingUsers.some(f => f.followed_user_id === targetUserId);
  };

  const hasSentRequest = (targetUserId: string) => {
    return sentRequests.some(r => r.addressee_id === targetUserId);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSearchAttempted(true);

    if (!searchTerm.trim()) {
      setError('検索語を入力してください。');
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('search_user_profiles', { search_term: searchTerm });

      if (error) {
        throw error;
      }

      setSearchResults(data || []);
    } catch (err: any) {
      console.error('Error searching users:', err);
      setError('ユーザー検索中にエラーが発生しました: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setSearchAttempted(false); // Reset on new input
    setSearchResults([]); // Clear previous results
    setError(null);
  };

  const sendFollowRequestMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!currentUser) throw new Error("ユーザーがログインしていません。");
      if (isFollowing(targetUserId)) throw new Error("既にフォローしています。");
      if (hasSentRequest(targetUserId)) throw new Error("既にフォローリクエストを送信済みです。");

      const { error: insertError } = await supabase
        .from('follow_relationships')
        .insert([{
          follower_id: currentUser.id,
          followed_id: targetUserId,
          status: 'pending'
        }])
        .select();

      if (insertError) {
        throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentFollowRequests'] });
      queryClient.invalidateQueries({ queryKey: ['pendingRequestsCount'] });
      alert('フォローリクエストを送信しました！');
    },
    onError: (err: any) => {
      console.error('Error sending follow request:', err);
      alert('フォローリクエストの送信に失敗しました: ' + err.message);
    },
  });

  const isGlobalLoading = isLoading || isLoadingFollowing || isLoadingSentRequests;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">ユーザー検索</h2>
      <form onSubmit={handleSearch} className="flex items-center mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchTermChange}
          placeholder="ユーザー名または表示名で検索"
          className="flex-grow p-2 border border-light-border dark:border-dark-border rounded-l-md bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
          disabled={isGlobalLoading}
        />
        <button
          type="submit"
          className="bg-light-primary text-white p-2 rounded-r-md hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isGlobalLoading || !searchTerm.trim()}
        >
          {isLoading ? <LoadingSpinner /> : <SearchIcon className="h-5 w-5" />}
        </button>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {searchResults.length > 0 && (
        <div className="space-y-3">
          {searchResults.map((user) => {
            const alreadyFollowing = isFollowing(user.id);
            const requestSent = hasSentRequest(user.id);
            const isCurrentUser = currentUser?.id === user.id;

            return (
              <div key={user.id} className="flex items-center justify-between bg-light-card dark:bg-dark-card p-3 rounded-md shadow-sm border border-light-border dark:border-dark-border">
                <div>
                  <p className="font-semibold text-light-text dark:text-dark-text">{user.display_name || user.username}</p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">@{user.username}</p>
                </div>
                {!isCurrentUser && (
                  <button
                    onClick={() => sendFollowRequestMutation.mutate(user.id)}
                    className={`px-3 py-1 rounded-md text-sm ${alreadyFollowing || requestSent ? 'bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300 cursor-not-allowed' : 'bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover'}`}
                    disabled={alreadyFollowing || requestSent || sendFollowRequestMutation.isPending}
                  >
                    {alreadyFollowing ? 'フォロー中' : requestSent ? 'リクエスト済み' : 'フォローする'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {searchAttempted && !isLoading && searchResults.length === 0 && !error && (
        <p className="text-light-text-secondary dark:text-dark-text-secondary text-center">ユーザーが見つかりませんでした。</p>
      )}
    </div>
  );
};

export default UserSearch;
