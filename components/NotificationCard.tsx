import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import type { Notification } from '../types';
import { twMerge } from 'tailwind-merge';

interface NotificationCardProps {
  notification: Notification;
  onClick: () => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ notification, onClick }) => {
  const { data: fromUserProfile } = useQuery({
    queryKey: ['userProfile', notification.from_user_id],
    queryFn: async () => {
      if (!notification.from_user_id) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name, username')
        .eq('id', notification.from_user_id)
        .single();
      if (error) {
        console.error('Error fetching fromUserProfile:', error);
        return null;
      }
      return data;
    },
    enabled: !!notification.from_user_id,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });

  const message = useMemo(() => {
    const fromUserName = fromUserProfile?.display_name || fromUserProfile?.username || '不明なユーザー';

    if (notification.message) {
      return notification.message;
    }

    switch (notification.type) {
      case 'new_favorite':
        return `${fromUserName}さんが新しいお店「${notification.restaurant_name || '不明な店舗'}」をお気に入りに追加しました！`;
      case 'follow_request':
        return `${fromUserName}さんからフォローリクエストが届きました！`;
      case 'follow_accepted':
        return `${fromUserName}さんがあなたのフォローリクエストを承認しました！`;
      default:
        return '新しい通知があります。';
    }
  }, [notification, fromUserProfile]);

  return (
    <div
      onClick={onClick}
      className={twMerge(
        "p-3 rounded-md -mx-1 border-b border-transparent last:border-b-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50",
        !notification.is_read && "bg-light-primary-soft-bg dark:bg-dark-primary-soft-bg"
      )}
    >
      <p className="text-sm text-light-text dark:text-dark-text">
        {message}
      </p>
      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
        {new Date(notification.created_at).toLocaleString('ja-JP')}
      </p>
    </div>
  );
};

export default NotificationCard;
