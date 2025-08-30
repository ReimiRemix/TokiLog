import React from 'react';
import { twMerge } from 'tailwind-merge';

interface NotificationCardProps {
  title: string;
  body: string;
  date: string; // 例: "2025-08-24"
  isNew?: boolean; // 新着マークを表示するかどうか
  className?: string; // 追加のスタイルを適用するため
}

const NotificationCard: React.FC<NotificationCardProps> = ({ title, body, date, isNew = false, className }) => {
  return (
    <div
      className={twMerge(
        'bg-light-card dark:bg-dark-card',
        'border border-light-border dark:border-dark-border',
        'rounded-ui-medium shadow-soft',
        'p-6',
        'animate-slide-down',
        className
      )}
    >
      {/* 上部セクション */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
          {title}
        </h3>
        {isNew && (
          <span className="bg-light-primary dark:bg-dark-primary text-white dark:text-slate-900 text-xs font-bold px-2.5 py-1 rounded-full">
            新着
          </span>
        )}
      </div>

      {/* 中央セクション */}
      <p className="text-base text-light-text-secondary dark:text-dark-text-secondary mt-2">
        {body}
      </p>

      {/* 下部セクション */}
      <time className="block text-sm text-light-text-secondary dark:text-dark-text-secondary text-right mt-4">
        {date}
      </time>
    </div>
  );
};

export default NotificationCard;