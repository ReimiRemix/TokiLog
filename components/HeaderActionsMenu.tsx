import React, { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import type { Theme } from '../App';
import SettingsIcon from './icons/SettingsIcon';
import RefreshPageIcon from './icons/RefreshPageIcon';
import LogOutIcon from './icons/LogOutIcon';
import TrashIcon from './icons/TrashIcon'; // アイコンをインポート
import ThemeToggle from './ThemeToggle';
import ConfirmationModal from './ConfirmationModal';

interface HeaderActionsMenuProps {
  user: User;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onLogout: () => void;
}

const HeaderActionsMenu: React.FC<HeaderActionsMenuProps> = ({ user, theme, setTheme, onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-ui-medium shadow-soft-lg z-50 animate-slide-down">
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
        </div>
    );
};

export default HeaderActionsMenu;