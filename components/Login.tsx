import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import minerucaIcon from '/mineruca_icon.png';
import LoadingSpinner from './icons/LoadingSpinner';

const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetFormState = () => {
    setError(null);
    setMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetFormState();
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetFormState();
    try {
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error("ユーザー名は半角英数字とアンダースコア(_)のみ使用できます。");
      }

      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            display_name: displayName,
            username: username,
          }
        }
      });
      if (error) {
          throw error;
      }
      setMessage('確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。');
    } catch (error: any) {
      setError(error.message || '登録に失敗しました。入力内容を確認してください。');
    } finally {
      setIsLoading(false);
    }
  };
  
  const isLoginFormInvalid = !email.trim() || !password.trim();
  const isSignUpFormInvalid = !email.trim() || !password.trim() || !displayName.trim() || !username.trim();

  const formInputClasses = "w-full px-4 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200";

  return (
    <div className="bg-light-bg dark:bg-dark-bg min-h-screen flex flex-col justify-center items-center p-4 font-sans animate-fade-in">
      <header className="mb-8 text-center">
        <div className="flex justify-center items-center gap-3">
          <img src={minerucaIcon} alt="MINERUCA logo" className="h-40 w-40" />
          <h1 className="text-4xl font-bold text-light-text dark:text-dark-text tracking-tighter">MINERUCA</h1>
        </div>
      </header>

      <main className="w-full max-w-4xl md:grid md:grid-cols-2 bg-light-card dark:bg-dark-card rounded-xl shadow-soft-lg border border-light-border dark:border-dark-border overflow-hidden">
        <div className="p-8 md:p-12">
          <div className="flex border-b border-light-border dark:border-dark-border mb-6">
            <button
              onClick={() => { setIsSignUp(false); resetFormState(); }}
              className={`w-1/2 py-3 font-semibold text-center transition-colors ${
                !isSignUp
                  ? 'border-b-2 border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary'
                  : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              ログイン
            </button>
            <button
              onClick={() => { setIsSignUp(true); resetFormState(); }}
              className={`w-1/2 py-3 font-semibold text-center transition-colors ${
                isSignUp
                  ? 'border-b-2 border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary'
                  : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              新規登録
            </button>
          </div>

          {message && <p className="text-sm text-center text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 p-3 rounded-md mb-4">{message}</p>}
          {error && <p className="text-sm text-center text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-3 rounded-md mb-4">{error}</p>}

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-5">
            {isSignUp && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">表示名</label>
                    <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="山田 太郎" required className={formInputClasses} disabled={isLoading} />
                  </div>
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">ユーザー名 (ID)</label>
                    <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="taro_yamada" required className={formInputClasses} disabled={isLoading} />
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">半角英数字と_のみ</p>
                  </div>
                </div>
              </>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">メールアドレス</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required className={formInputClasses} disabled={isLoading} />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">パスワード</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className={formInputClasses} disabled={isLoading} />
               {isSignUp && <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">6文字以上で入力してください。</p>}
            </div>
            
            <button
                type="submit"
                disabled={isLoading || (isSignUp ? isSignUpFormInvalid : isLoginFormInvalid)}
                className="flex items-center justify-center w-full bg-light-primary text-white font-bold px-6 py-3 rounded-lg hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover focus:outline-none focus:ring-4 focus:ring-light-primary/30 dark:focus:ring-dark-primary/40 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                <>
                    <LoadingSpinner />
                    <span className="ml-2">{isSignUp ? '登録中...' : 'ログイン中...'}</span>
                </>
                ) : (
                  isSignUp ? '登録する' : 'ログイン'
                )}
            </button>
          </form>
        </div>

        <div className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 p-12">
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold tracking-tighter mb-3">美味のコレクション</h2>
            <p className="text-lg font-light text-gray-300">AIと共に、あなただけのお気に入りリストを作成・共有しましょう。</p>
          </div>
        </div>
      </main>

      <footer className="mt-8 text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
        <p className="mt-4 opacity-70">© 2025 Oplix. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Login;
