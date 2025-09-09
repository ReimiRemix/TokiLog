import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './icons/LoadingSpinner';
import { Notification } from '../types';
import NotificationCard from './NotificationCard';
import { getSentFollowRequests, SentFollowRequest } from '../services/followService';
import CheckIcon from './icons/CheckIcon';
import XIcon from './icons/XIcon';

interface NotificationsViewProps {
  notifications: Notification[];
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ notifications }) => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: Infinity, // We don't need to refetch the user frequently
  });

  // Fetch sent follow requests
  const { data: sentRequests, isLoading: isLoadingSent, error: errorSent } = useQuery<SentFollowRequest[]>({
    queryKey: ['sentFollowRequests', currentUser?.id],
    queryFn: getSentFollowRequests,
    enabled: !!currentUser,
    refetchOnMount: 'always',
  });

  const acceptMutation = useMutation({
    mutationFn: async (notification: Notification) => {
      if (!notification.follow_request_id) throw new Error('Invalid notification for this action');

      // 1. Accept the follow request
      const { error: acceptError } = await supabase
        .from('follow_relationships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', notification.follow_request_id);
      if (acceptError) throw acceptError;

      // 2. Delete the notification
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notification.id);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['sentFollowRequests'] });
      alert('フォローリクエストを承認しました！');
    },
    onError: (err: any) => {
      console.error('Error accepting follow request:', err);
      alert('フォローリクエストの承認に失敗しました: ' + err.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (notification: Notification) => {
      if (!notification.follow_request_id) throw new Error('Invalid notification for this action');

      // 1. Reject (delete) the follow request
      const { error: rejectError } = await supabase
        .from('follow_relationships')
        .delete()
        .eq('id', notification.follow_request_id);
      if (rejectError) throw rejectError;

      // 2. Delete the notification
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notification.id);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['sentFollowRequests'] }); // Invalidate sent requests too
      alert('フォローリクエストを拒否しました。');
    },
    onError: (err: any) => {
      console.error('Error rejecting follow request:', err);
      alert('フォローリクエストの拒否に失敗しました: ' + err.message);
    },
  });

  const cancelSentRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('follow_relationships')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentFollowRequests'] });
      alert('送信したフォローリクエストをキャンセルしました。');
    },
    onError: (err: any) => {
      console.error('Error canceling sent follow request:', err);
      alert('送信したフォローリクエストのキャンセルに失敗しました: ' + err.message);
    },
  });

  if (isLoadingSent) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingSpinner />
        <span className="ml-2 text-light-text dark:text-dark-text">通知を読み込み中...</span>
      </div>
    );
  }

  if (errorSent) {
    return <div className="text-red-500 p-4">送信リクエストの読み込みエラー: {errorSent.message}</div>;
  }

  const hasNotifications = notifications && notifications.length > 0;
  const hasSentRequests = sentRequests && sentRequests.length > 0;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">通知</h2>

      {!hasNotifications && !hasSentRequests && (
        <div className="text-light-text-secondary dark:text-dark-text-secondary p-4 text-center">通知はありません。</div>
      )}

      {hasNotifications && (
        <div className="space-y-3 mb-6">
          <h3 className="text-xl font-semibold mb-3 text-light-text dark:text-dark-text">受信した通知</h3>
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onClick={() => {
                // 通知がクリックされたときの処理（例：既読にする、詳細表示など）
                // ここでは何もしないか、必要に応じて実装
              }}
              onAcceptFollowRequest={acceptMutation.mutate}
              onRejectFollowRequest={rejectMutation.mutate}
            />
          ))}
        </div>
      )}

      {hasSentRequests && (
        <div>
          <h3 className="text-xl font-semibold mb-3 text-light-text dark:text-dark-text">送信したリクエスト</h3>
          <div className="space-y-3">
            {sentRequests.map((request) => (
              <div key={request.request_id} className="flex items-center justify-between bg-light-card dark:bg-dark-card p-3 rounded-md shadow-sm border border-light-border dark:border-dark-border">
                <div>
                  <p className="font-semibold text-light-text dark:text-dark-text">
                    {request.addressee_display_name || request.addressee_username}
                  </p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    @{request.addressee_username} へのリクエスト
                  </p>
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                    {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => cancelSentRequestMutation.mutate(request.request_id)}
                    disabled={cancelSentRequestMutation.isPending}
                    className="bg-red-500 text-white px-3 py-1.5 rounded-full hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5" 
                  >
                    <XIcon className="w-4 h-4" /> キャンセル
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsView;
