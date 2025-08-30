

import React from 'react';
import EyeIcon from './icons/EyeIcon';

interface ReadOnlyBannerProps {
  isFiltered: boolean;
}

const ReadOnlyBanner: React.FC<ReadOnlyBannerProps> = ({ isFiltered }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-amber-400 dark:bg-amber-600 text-slate-900 dark:text-white py-2 px-4 shadow-md animate-slide-down">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-sm font-semibold">
        <EyeIcon />
        <span>{isFiltered ? '閲覧専用モード（フィルター適用済み）' : '閲覧専用モード'}</span>
      </div>
    </div>
  );
};

const EyeIcon: React.FC = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);


export default ReadOnlyBanner;