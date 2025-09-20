import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './icons/LoadingSpinner';
import SearchIcon from './icons/SearchIcon';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@supabase/supabase-js';
import { getFollowingUsers, getSentFollowRequests } from '../services/followService';
import type { UserProfile, FollowStatus } from '../types';
import UserCard from './UserCard';

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

  const getFollowStatus = (targetUserId: string): FollowStatus => {
    if (followingUsers.some(f => f.followed_user_id === targetUserId)) {
      return 'following';
    }
    if (sentRequests.some(r => r.addressee_id === targetUserId)) {
      return 'pending';
    }
    return 'none';
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
      const status = getFollowStatus(targetUserId);
      if (status === 'following') throw new Error("既にフォローしています。");
      if (status === 'pending') throw new Error("既にフォローリクエストを送信済みです。");

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
      // Using a more subtle notification is better than alert, but sticking to layout changes for now.
      alert('フォローリクエストを送信しました！');
    },
    onError: (err: any) => {
      console.error('Error sending follow request:', err);
      alert('フォローリクエストの送信に失敗しました: ' + err.message);
    },
  });

  const isGlobalLoading = isLoading || isLoadingFollowing || isLoadingSentRequests;

  return (
    <div className="space-y-6">
      <div className="bg-light-card dark:bg-dark-card p-6 rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border">
        <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">ユーザーを探す</h2>
        <form onSubmit={handleSearch} className="flex items-center">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchTermChange}
            placeholder="ユーザー名または表示名で検索"
            className="flex-grow p-3 border border-light-border dark:border-dark-border rounded-l-lg bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary transition"
            disabled={isGlobalLoading}
          />
          <button
            type="submit"
            className="bg-light-primary text-white p-3 rounded-r-lg hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isGlobalLoading || !searchTerm.trim()}
          >
            {isLoading ? <LoadingSpinner /> : <SearchIcon className="h-6 w-6" />}
          </button>
        </form>
      </div>

      {error && <p className="text-red-500 p-4 bg-red-100 dark:bg-red-900/50 rounded-lg text-center">{error}</p>}

      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text px-2">検索結果</h3>
          {searchResults.map((user) => {
            const status = getFollowStatus(user.id);
            const isCurrentUser = currentUser?.id === user.id;
            const buttonState = {
              text: status === 'following' ? 'フォロー中' : status === 'pending' ? 'リクエスト済み' : 'フォローする',
              disabled: status === 'following' || status === 'pending',
            };

            return (
              <UserCard key={user.id} user={user}>
                {!isCurrentUser && (
                  <button
                    onClick={() => sendFollowRequestMutation.mutate(user.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      buttonState.disabled
                        ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 cursor-not-allowed'
                        : 'bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover'
                    }`}
                    disabled={buttonState.disabled || sendFollowRequestMutation.isPending}
                  >
                    {buttonState.text}
                  </button>
                )}
              </UserCard>
            );
          })}
        </div>
      )}

      {searchAttempted && !isLoading && searchResults.length === 0 && !error && (
        <p className="text-light-text-secondary dark:text-dark-text-secondary text-center p-8">ユーザーが見つかりませんでした。</p>
      )}
    </div>
  );
};

export default UserSearch;