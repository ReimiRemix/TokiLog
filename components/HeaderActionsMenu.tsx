import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import type { Notification } from '../types';
import type { Theme } from '../App';
import SettingsIcon from './icons/SettingsIcon';
import RefreshPageIcon from './icons/RefreshPageIcon';
import LogOutIcon from './icons/LogOutIcon';
import TrashIcon from './icons/TrashIcon'; // アイコンをインポート
import ThemeToggle from './ThemeToggle';
import { twMerge } from 'tailwind-merge';
import ConfirmationModal from './ConfirmationModal';

interface HeaderActionsMenuProps {
  user: User;
  onScrollToRestaurant: (restaurantId: string) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onLogout: () => void;
}

const HeaderActionsMenu: React.FC<HeaderActionsMenuProps> = ({ user, onScrollToRestaurant, theme, setTheme, onLogout }) => {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications', user.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);
            if (error) throw new Error(error.message);
            return data as Notification[];
        },
        refetchInterval: 5000,
    });

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`notifications:user_id=eq.${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, queryClient]);

    const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
            if (unreadIds.length === 0) return;
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .in('id', unreadIds);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        },
    });

    const clearAllNotificationsMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', user.id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
            setIsClearConfirmOpen(false);
            setIsOpen(false); // Close dropdown after clearing
        },
        onError: (error) => {
            alert(`通知のクリアに失敗しました: ${error.message}`);
        },
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notification: Notification) => {
        onScrollToRestaurant(notification.restaurant_id);
        setIsOpen(false);
        if (!notification.is_read) {
           markAllAsReadMutation.mutate();
        }
    };

    const handleForceCacheClear = () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(const registration of registrations) {
                    registration.unregister();
                }
                alert('キャッシュをクリアしました。ページをリロードします。');
                window.location.reload(true);
            }).catch(function(err) {
                alert('キャッシュのクリアに失敗しました: ' + err.message);
            });
        } else {
            alert('このブラウザはService Workerをサポートしていません。');
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                <SettingsIcon />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-light-bg dark:ring-dark-bg" />
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-ui-medium shadow-soft-lg z-50 animate-slide-down">
                    <div className="p-3 border-b border-light-border dark:border-dark-border">
                        <h3 className="font-semibold text-light-text dark:text-dark-text">通知</h3>
                        {notifications.length === 0 ? (
                            <p className="p-4 text-sm text-center text-light-text-secondary dark:text-dark-text-secondary">新しい通知はありません。</p>
                        ) : (
                           <div className="mt-2 max-h-60 overflow-y-auto -mr-1 pr-1">
                             {notifications.map(n => (
                                <div key={n.id} onClick={() => handleNotificationClick(n)} className={twMerge("p-3 rounded-md -mx-1 border-b border-transparent last:border-b-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50", !n.is_read && "bg-light-primary-soft-bg dark:bg-dark-primary-soft-bg")}>
                                    <p className="text-sm text-light-text dark:text-dark-text">
                                        <strong className="font-semibold">{n.restaurant_name}</strong> がお気に入りに追加されました。
                                    </p>
                                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">{new Date(n.created_at).toLocaleString('ja-JP')}</p>
                                </div>
                            ))}
                           </div>
                        )}
                        {notifications.length > 0 && unreadCount > 0 && (
                            <button onClick={() => markAllAsReadMutation.mutate()} disabled={markAllAsReadMutation.isPending} className="w-full text-center mt-2 text-xs font-semibold text-light-primary dark:text-dark-primary hover:opacity-80 transition-opacity disabled:opacity-50">すべて既読にする</button>
                        )}
                        {notifications.length > 0 && (
                            <button onClick={() => setIsClearConfirmOpen(true)} disabled={clearAllNotificationsMutation.isPending} className="w-full text-center mt-2 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50">
                                すべてクリア
                            </button>
                        )}
                    </div>
                    <div className="p-2 border-b border-light-border dark:border-dark-border">
                        <ThemeToggle theme={theme} setTheme={setTheme} />
                    </div>
                    <div className="p-2 space-y-1">
                        <button onClick={() => window.location.reload()} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                            <RefreshPageIcon />
                            <span>ページを更新</span>
                        </button>
                        <button onClick={handleForceCacheClear} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-800/50 transition-colors">
                            <TrashIcon />
                            <span>強制キャッシュクリア</span>
                        </button>
                        <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                            <LogOutIcon />
                            <span>ログアウト</span>
                        </button>
                    </div>
                </div>
            )}
            {isClearConfirmOpen && (
                <ConfirmationModal
                    isOpen={isClearConfirmOpen}
                    onClose={() => setIsClearConfirmOpen(false)}
                    onConfirm={() => clearAllNotificationsMutation.mutate()}
                    title="通知をすべてクリア"
                    confirmText="クリア"
                    isDestructive
                >
                    <p>すべての通知を本当にクリアしますか？この操作は元に戻せません。</p>
                </ConfirmationModal>
            )}
        </div>
    );
};

export default HeaderActionsMenu;