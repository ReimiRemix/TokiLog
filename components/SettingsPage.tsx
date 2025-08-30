import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import SmallLoadingSpinner from './icons/SmallLoadingSpinner';
import ConfirmationModal from './ConfirmationModal';

const SettingsPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        setEmail(user.email || '');
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('display_name, username')
          .eq('id', user.id)
          .single();

        if (profile) {
          setDisplayName(profile.display_name || '');
          setUsername(profile.username || '');
        } else if (error) {
          setFeedback({ type: 'error', message: 'プロフィールの読み込みに失敗しました。' });
        }
      }
      setLoading(false);
    };
    fetchUserData();
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setFeedback(null);
    const { error } = await supabase
      .from('user_profiles')
      .update({ display_name: displayName, username: username })
      .eq('id', user.id);

    if (error) {
      setFeedback({ type: 'error', message: `プロフィールの更新に失敗しました: ${error.message}` });
    } else {
      setFeedback({ type: 'success', message: 'プロフィールを更新しました。' });
    }
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const { error } = await supabase.auth.updateUser({ email });
    if (error) {
      setFeedback({ type: 'error', message: `メールアドレスの更新に失敗しました: ${error.message}` });
    } else {
      setFeedback({ type: 'success', message: '確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。' });
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!password) {
      setFeedback({ type: 'error', message: '新しいパスワードを入力してください。' });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setFeedback({ type: 'error', message: `パスワードの更新に失敗しました: ${error.message}` });
    } else {
      setPassword('');
      setFeedback({ type: 'success', message: 'パスワードを更新しました。' });
    }
  };
  
  const handleDeleteAccount = async () => {
    setFeedback(null);
    setIsDeleteModalOpen(false);

    const session = await supabase.auth.getSession();
    const token = session?.data.session?.access_token;

    if (!token) {
      setFeedback({ type: 'error', message: '認証エラーが発生しました。再度ログインしてください。' });
      return;
    }

    try {
      const response = await fetch('/.netlify/functions/delete-user-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'サーバーでエラーが発生しました。');
      }
      
      setFeedback({ type: 'success', message: 'アカウントが正常に削除されました。' });
      // Log out the user
      await supabase.auth.signOut();
      // You might want to redirect the user to the login page after a short delay
      setTimeout(() => window.location.reload(), 2000);

    } catch (error: any) {
      setFeedback({ type: 'error', message: `アカウントの削除に失敗しました: ${error.message}` });
    }
  };


  if (loading) {
    return <div className="flex justify-center items-center p-4"><SmallLoadingSpinner /></div>;
  }

  return (
    <div className="space-y-12">
      <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">設定</h1>

      {feedback && (
        <div className={`p-4 rounded-md ${feedback.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}`}>
          {feedback.message}
        </div>
      )}

      {/* Profile Settings */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-light-border dark:border-dark-border pb-2">プロフィール</h2>
        <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-lg">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium mb-1">表示名</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200"
            />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1">ユーザー名 (ID)</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200"
            />
             <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">半角英数字とアンダースコア(_)のみ使用できます。</p>
          </div>
          <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-md bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors">プロフィールを更新</button>
        </form>
      </div>

      {/* Account Settings */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold border-b border-light-border dark:border-dark-border pb-2">アカウント</h2>
        <form onSubmit={handleEmailUpdate} className="space-y-4 max-w-lg">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">メールアドレス</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200"
            />
          </div>
          <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-md bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors">メールアドレスを更新</button>
        </form>
        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-lg">
          <div>
            <label htmlFor="password">新しいパスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-3 pr-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200"
            />
             <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">6文字以上で入力してください。</p>
          </div>
          <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-md bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors">パスワードを更新</button>
        </form>
      </div>
      
      {/* Danger Zone */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-red-600 dark:text-red-400 border-b border-red-500/50 pb-2">危険な操作</h2>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-md max-w-lg">
            <h3 className="font-bold text-red-800 dark:text-red-300">アカウントの削除</h3>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1 mb-4">
                この操作は元に戻せません。すべてのお気に入り、フォロー情報、プロフィールが完全に削除されます。
            </p>
            <button onClick={() => setIsDeleteModalOpen(true)} className="px-4 py-2 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors">
                アカウントを削除する
            </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
        title="アカウントの最終確認"
      >
        <p>本当にアカウントを削除しますか？この操作は取り消すことができず、すべてのデータが永久に失われます。</p>
      </ConfirmationModal>
    </div>
  );
};

export default SettingsPage;