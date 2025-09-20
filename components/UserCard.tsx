import React from 'react';
import type { UserProfile } from '../types';
import UserIcon from './icons/UserIcon';
import { twMerge } from 'tailwind-merge';

interface UserCardProps {
  user: UserProfile;
  onClick?: (userId: string) => void;
  children?: React.ReactNode;
}

const UserCard: React.FC<UserCardProps> = ({ user, onClick, children }) => {
  const isClickable = !!onClick;

  return (
    <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-soft border border-light-border dark:border-dark-border flex items-center gap-4">
      {/* Avatar Placeholder */}
      <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
        {/* In the future, you can use user.avatar_url here */}
        <UserIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
      </div>

      {/* User Info */}
      <div 
        className={twMerge("flex-grow", isClickable && "cursor-pointer")}
        onClick={() => onClick && onClick(user.id)}
      >
        <p className="font-bold text-light-text dark:text-dark-text">{user.display_name || user.username}</p>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">@{user.username}</p>
      </div>

      {/* Action Buttons */}
      {children && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
};

export default UserCard;