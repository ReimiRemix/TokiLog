import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBlockedUsers, unblockUser, BlockedUser } from '../services/blockService';
import LoadingSpinner from './icons/LoadingSpinner';
import ConfirmationModal from './ConfirmationModal';

const BlockedUsersList: React.FC = () => {
  const queryClient = useQueryClient();
  const [userToUnblock, setUserToUnblock] = useState<BlockedUser | null>(null);

  const { data: blockedUsers, isLoading, error } = useQuery<BlockedUser[]>({
    queryKey: ['blockedUsers'],
    queryFn: getBlockedUsers
  });

  const unblockMutation = useMutation({
    mutationFn: unblockUser,
    onSuccess: () => {
      alert('ユーザーのブロックを解除しました。');
      setUserToUnblock(null);
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
    },
    onError: (error) => {
      alert(`ブロックの解除に失敗しました: ${error.message}`);
    },
  });

  const handleConfirmUnblock = () => {
    if (userToUnblock) {
      unblockMutation.mutate(userToUnblock.blocked_user_id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingSpinner />
        <span className="ml-2 text-light-text dark:text-dark-text">ブロックリストを読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">エラー: {error.message}</div>;
  }

  if (!blockedUsers || blockedUsers.length === 0) {
    return <div className="text-light-text-secondary dark:text-dark-text-secondary p-4 text-center">ブロック中のユーザーはいません。</div>;
  }

  return (
    <>
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">ブロック中のユーザー</h2>
        <div className="space-y-3">
          {blockedUsers.map((user) => (
            <div
              key={user.blocked_user_id}
              className="flex items-center justify-between bg-light-card dark:bg-dark-card p-3 rounded-md shadow-sm border border-light-border dark:border-dark-border"
            >
              <div>
                <p className="font-semibold text-light-text dark:text-dark-text">
                  {user.blocked_display_name || user.blocked_username}
                </p>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  @{user.blocked_username}
                </p>
              </div>
              <button 
                onClick={() => setUserToUnblock(user)}
                className="px-3 py-1.5 text-sm font-semibold rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                ブロック解除
              </button>
            </div>
          ))}
        </div>
      </div>

      {userToUnblock && (
        <ConfirmationModal
          isOpen={!!userToUnblock}
          onClose={() => setUserToUnblock(null)}
          onConfirm={handleConfirmUnblock}
          title={`${userToUnblock.blocked_display_name || userToUnblock.blocked_username}さんのブロックを解除`}
          confirmText="ブロック解除"
        >
          <p>本当にこのユーザーのブロックを解除しますか？</p>
        </ConfirmationModal>
      )}
    </>
  );
};

export default BlockedUsersList;
