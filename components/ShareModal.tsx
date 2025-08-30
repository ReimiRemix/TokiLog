

import React, { useState, useEffect, useMemo } from 'react';
import XIcon from './icons/XIcon';
import CheckIcon from './icons/CheckIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import SmallLoadingSpinner from './icons/SmallLoadingSpinner';
import type { ShareFilters } from '../types';
import InfoIcon from './icons/InfoIcon';
import TwitterIcon from './icons/TwitterIcon';
import LineIcon from './icons/LineIcon';
import MailIcon from './icons/MailIcon';
import InstagramIcon from './icons/InstagramIcon';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  isLoading: boolean;
  activeFilters: ShareFilters;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, shareUrl, isLoading, activeFilters }) => {
  const [hasCopied, setHasCopied] = useState(false);
  const [showInstagramCopyMessage, setShowInstagramCopyMessage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasCopied(false);
      setShowInstagramCopyMessage(false);
    }
  }, [isOpen]);

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000); // Reset after 2 seconds
    });
  };

  const handleInstagramCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShowInstagramCopyMessage(true);
      setTimeout(() => setShowInstagramCopyMessage(false), 5000); // Message disappears after 5 seconds
    });
  };
  
  const filterDescription = useMemo(() => {
    if (!activeFilters) return null;
    
    const { sidebarFilters, genreFilters } = activeFilters;
    
    const parts: string[] = [];

    if (sidebarFilters && sidebarFilters.length > 0) {
      const areaParts = sidebarFilters.map(f => f.value);
      if (areaParts.length > 0) {
        parts.push(`エリア: ${areaParts.join(', ')}`);
      }
    }

    if (genreFilters && genreFilters.length > 0) {
      const validGenres = genreFilters.filter(g => g !== 'all');
      if (validGenres.length > 0) {
        parts.push(`ジャンル: ${validGenres.join(', ')}`);
      }
    }

    if (parts.length === 0) return null;
    return parts.join('、');
  }, [activeFilters]);

  const handleTwitterShare = (url: string) => {
    const text = encodeURIComponent('私のお気に入りのお店リストをチェック！');
    const encodedUrl = encodeURIComponent(url);
    window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`, '_blank');
  };
  
  const handleLineShare = (url: string) => {
    const encodedUrl = encodeURIComponent(url);
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodedUrl}`, '_blank');
  };
  
  const handleMailShare = (url: string) => {
    const subject = encodeURIComponent('私のお気に入りのお店リスト');
    const body = encodeURIComponent(`こちらから私のお気に入りのお店リストをチェックしてください: ${url}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-light-card dark:bg-dark-card rounded-ui-medium shadow-soft-lg w-full max-w-lg flex flex-col animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">お気に入りを共有</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <XIcon className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
          </button>
        </header>

        <div className="p-6">
           {filterDescription ? (
              <div className="flex items-start gap-3 p-3 mb-4 rounded-md bg-sky-50 dark:bg-sky-900/40 border border-sky-200 dark:border-sky-800">
                  <InfoIcon className="w-5 h-5 flex-shrink-0 mt-0.5 text-sky-600 dark:text-sky-300" />
                  <div>
                      <h4 className="font-semibold text-sm text-sky-800 dark:text-sky-200">フィルターが適用されています</h4>
                      <p className="text-xs text-sky-700 dark:text-sky-300 mt-1">
                          現在適用中のフィルター（{filterDescription}）が共有リンクにも反映されます。閲覧者はフィルターされたお店のみを見ることができます。
                      </p>
                  </div>
              </div>
          ) : (
             <div className="flex items-start gap-3 p-3 mb-4 rounded-md bg-slate-100 dark:bg-slate-800/60 border border-light-border dark:border-dark-border">
                  <InfoIcon className="w-5 h-5 flex-shrink-0 mt-0.5 text-light-text-secondary dark:text-dark-text-secondary" />
                  <div>
                      <h4 className="font-semibold text-sm text-light-text dark:text-dark-text">すべてのリストを共有します</h4>
                      <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                          現在フィルターは適用されていません。閲覧者はすべてのお気に入りを見ることができ、自由にフィルターをかけることもできます。
                      </p>
                  </div>
              </div>
          )}
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
            以下のリンクを共有すると、他の人があなたのお気に入りリストを閲覧できます。このリンクは24時間有効です。
          </p>
          
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={isLoading ? 'リンクを生成中...' : shareUrl}
              className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 border border-light-border dark:border-dark-border rounded-md text-light-text-secondary dark:text-dark-text-secondary"
            />
            {isLoading ? (
                <div className="w-10 h-10 flex items-center justify-center">
                    <SmallLoadingSpinner />
                </div>
            ) : (
                <button
                onClick={handleCopy}
                disabled={!shareUrl}
                className="flex-shrink-0 p-2 rounded-md bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors disabled:opacity-50"
                >
                {hasCopied ? <CheckIcon /> : <ClipboardIcon />}
                </button>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-light-border dark:border-dark-border">
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-3">
              SNSで共有:
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleTwitterShare(shareUrl)}
                disabled={!shareUrl || isLoading}
                className="p-2 rounded-full bg-blue-400 text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
                aria-label="Twitterで共有"
              >
                <TwitterIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleInstagramCopy}
                disabled={!shareUrl || isLoading}
                className="p-2 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-colors disabled:opacity-50"
                aria-label="Instagramで共有"
              >
                <InstagramIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleLineShare(shareUrl)}
                disabled={!shareUrl || isLoading}
                className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
                aria-label="LINEで共有"
              >
                <LineIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleMailShare(shareUrl)}
                disabled={!shareUrl || isLoading}
                className="p-2 rounded-full bg-gray-500 text-white hover:bg-gray-600 transition-colors disabled:opacity-50"
                aria-label="メールで共有"
              >
                <MailIcon className="w-5 h-5" />
              </button>
            </div>
            {showInstagramCopyMessage && (
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">
                リンクをコピーしました。Instagramアプリ内で手動で貼り付けて共有してください。
              </p>
            )}
          </div>
        </div>

        <footer className="flex justify-end p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-ui-medium">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-md text-light-text-secondary dark:text-dark-text-secondary bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-light-border dark:border-dark-border transition-colors"
          >
            閉じる
          </button>
        </footer>
      </div>
    </div>
  );
};


const ClipboardIcon: React.FC = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
);

export default ShareModal;