import React from 'react';
import { twMerge } from 'tailwind-merge';
import type { View } from '../types';
import StarIcon from './icons/StarIcon';
import UsersIcon from './icons/UsersIcon';
import SearchIcon from './icons/SearchIcon';
import BellIcon from './icons/BellIcon';

interface BottomTabBarProps {
  currentView: View;
  onSelectView: (view: View) => void;
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({ currentView, onSelectView }) => {
  const menuItems = [
    { id: 'favorites', label: 'お気に入り', icon: StarIcon },
    { id: 'userSearch', label: 'ユーザー検索', icon: UsersIcon },
    { id: 'search', label: 'お店検索', icon: SearchIcon },
    { id: 'pendingRequests', label: '通知', icon: BellIcon },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-light-card dark:bg-dark-card border-t border-light-border dark:border-dark-border md:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectView(item.id as View)}
            className={twMerge(
              'flex flex-col items-center justify-center gap-1 w-full h-full transition-colors',
              currentView === item.id
                ? 'text-light-primary dark:text-dark-primary'
                : 'text-light-text-secondary dark:text-dark-text-secondary'
            )}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomTabBar;
