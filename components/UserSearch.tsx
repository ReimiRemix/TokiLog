import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './icons/LoadingSpinner';
import SearchIcon from './icons/SearchIcon';

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
}

const UserSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSearchResults([]);

    if (!searchTerm.trim()) {
      setError('検索語を入力してください。');
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

  const handleFollowRequest = async (targetUserId: string) => {
    // Implement follow request logic here
    console.log('Sending follow request to:', targetUserId);
    try {
      const { error } = await supabase.rpc('send_follow_request', { p_target_user_id: targetUserId });
      if (error) {
        throw error;
      }
      alert('フォローリクエストを送信しました！');
      // Optionally, update UI to reflect pending request
    } catch (err: any) {
      console.error('Error sending follow request:', err);
      alert('フォローリクエストの送信に失敗しました: ' + err.message);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">ユーザー検索</h2>
      <form onSubmit={handleSearch} className="flex items-center mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="ユーザー名または表示名で検索"
          className="flex-grow p-2 border border-light-border dark:border-dark-border rounded-l-md bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-light-primary text-white p-2 rounded-r-md hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? <LoadingSpinner /> : <SearchIcon className="h-5 w-5" />}
        </button>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {searchResults.length > 0 && (
        <div className="space-y-3">
          {searchResults.map((user) => (
            <div key={user.id} className="flex items-center justify-between bg-light-card dark:bg-dark-card p-3 rounded-md shadow-sm border border-light-border dark:border-dark-border">
              <div>
                <p className="font-semibold text-light-text dark:text-dark-text">{user.display_name || user.username}</p>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">@{user.username}</p>
              </div>
              <button
                onClick={() => handleFollowRequest(user.id)}
                className="bg-light-primary text-white px-3 py-1 rounded-md text-sm hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover"
              >
                フォロー
              </button>
            </div>
          ))}
        </div>
      )}

      {!isLoading && searchResults.length === 0 && searchTerm.trim() && !error && (
        <p className="text-light-text-secondary dark:text-dark-text-secondary text-center">ユーザーが見つかりませんでした。</p>
      )}
    </div>
  );
};

export default UserSearch;
