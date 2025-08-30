
import React, { useEffect } from 'react';
import XIcon from './icons/XIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, children }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-light-card dark:bg-dark-card rounded-ui-medium shadow-soft-lg w-full max-w-md flex flex-col animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <XIcon className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
          </button>
        </header>

        <div className="p-6 flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-grow text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {children}
            </div>
        </div>

        <footer className="flex justify-end items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-ui-medium">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-md text-light-text-secondary dark:text-dark-text-secondary bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-light-border dark:border-dark-border transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            削除
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ConfirmationModal;
