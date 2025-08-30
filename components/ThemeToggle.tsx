import React from 'react';
import type { Theme } from '../App';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';

interface ThemeToggleProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, setTheme }) => {
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">ライト</span>
      <button
        onClick={toggleTheme}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-light-primary focus:ring-offset-2 dark:ring-offset-dark-card ${
          theme === 'dark' ? 'bg-light-primary' : 'bg-slate-300'
        }`}
        role="switch"
        aria-checked={theme === 'dark'}
      >
        <span className="sr-only">テーマを切り替える</span>
        <span
          className={`pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          <span
            className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity duration-200 ease-in-out ${
              theme === 'dark' ? 'opacity-0 ease-out' : 'opacity-100 ease-in'
            }`}
            aria-hidden="true"
          >
            <SunIcon />
          </span>
          <span
            className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity duration-200 ease-in-out ${
              theme === 'dark' ? 'opacity-100 ease-in' : 'opacity-0 ease-out'
            }`}
            aria-hidden="true"
          >
            <MoonIcon />
          </span>
        </span>
      </button>
       <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">ダーク</span>
    </div>
  );
};

export default ThemeToggle;