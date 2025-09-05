import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './icons/LoadingSpinner';
import { Notification } from '../types';
import NotificationCard from './NotificationCard';

const NotificationsView: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: Infinity, // We don't need to refetch the user frequently
  });

  // Fetch all notifications for the current user
  const { data: notifications, isLoading, error } = useQuery<Notification[]> ({
    queryKey: ['notifications', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentUser,
    refetchOnMount: 'always',
  });

  const acceptMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('follow_relationships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      alert('フォローリクエストを承認しました！');
    },
    onError: (err: any) => {
      console.error('Error accepting follow request:', err);
      alert('フォローリクエストの承認に失敗しました: ' + err.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('follow_relationships')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      alert('フォローリクエストを拒否しました。');
    },
    onError: (err: any) => {
      console.error('Error rejecting follow request:', err);
      alert('フォローリクエストの拒否に失敗しました: ' + err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingSpinner />
        <span className="ml-2 text-light-text dark:text-dark-text">通知を読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">通知の読み込みエラー: {error.message}</div>;
  }

  const hasNotifications = notifications && notifications.length > 0;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">通知</h2>

      {!hasNotifications && (
        <div className="text-light-text-secondary dark:text-dark-text-secondary p-4 text-center">通知はありません。</div>
      )}

      {hasNotifications && (
        <div className="space-y-3">
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
    </div>
  );
};

export default NotificationsView;
