import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import ForkKnifeIcon from './icons/ForkKnifeIcon';
import LoadingSpinner from './icons/LoadingSpinner';
import UserIcon from './icons/UserIcon';
import LockIcon from './icons/LockIcon';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) {
          throw error;
      }
    } catch (error: any) {
      setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
      setIsLoading(false);
    }
  };
  
  const isFormInvalid = !email.trim() || !password.trim();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-light-bg dark:bg-dark-bg p-4 animate-slide-down">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
            <div className="flex justify-center items-center gap-3 mb-2">
                <ForkKnifeIcon />
                <h1 className="text-5xl font-extrabold text-light-text dark:text-dark-text tracking-tighter">ロケーションレコード</h1>
            </div>
            <p className="text-lg text-light-text-secondary dark:text-dark-text-secondary">AIと紡ぐ、あなただけの美食の記録</p>
        </header>
        
        <div className="bg-light-card dark:bg-dark-card p-8 rounded-ui-medium shadow-soft-lg border border-light-border dark:border-dark-border">
          <h2 className="text-2xl font-bold text-center text-light-text dark:text-dark-text mb-6">ログイン</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <UserIcon className="h-5 w-5 text-light-text-secondary dark:text-dark-text-secondary" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス"
                autoComplete="email"
                required
                className="w-full pl-10 pr-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200"
                disabled={isLoading}
              />
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <LockIcon className="h-5 w-5 text-light-text-secondary dark:text-dark-text-secondary" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200"
                disabled={isLoading}
              />
            </div>
            
            {error && <p className="text-sm text-center text-red-600 dark:text-red-400">{error}</p>}

            <button
                type="submit"
                disabled={isLoading || isFormInvalid}
                className="flex items-center justify-center w-full bg-light-primary text-white font-bold px-6 py-3 rounded-lg hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-primary transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                <>
                    <LoadingSpinner />
                    <span>ログイン中...</span>
                </>
                ) : (
                'ログイン'
                )}
            </button>
          </form>
          <p className="text-xs text-center text-light-text-secondary dark:text-dark-text-secondary mt-6">
            このアプリケーションは共有アカウントで利用します。
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;