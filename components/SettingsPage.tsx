import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import SmallLoadingSpinner from './icons/SmallLoadingSpinner';
import ConfirmationModal from './ConfirmationModal';
import BlockedUsersList from './BlockedUsersList'; // Import the new component

type SettingSection = 'profile' | 'account' | 'user-management' | 'blocked-users' | 'danger-zone';

const SettingsPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingSection>('profile');

  // State for new user registration form
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUsername, setNewUsername] = useState('');


  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        setEmail(user.email || '');
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('display_name, username, is_super_admin')
          .eq('id', user.id)
          .single();

        if (profile) {
          setDisplayName(profile.display_name || '');
          setUsername(profile.username || '');
          setIsSuperAdmin(profile.is_super_admin || false);
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
      await supabase.auth.signOut();
      setTimeout(() => window.location.reload(), 2000);

    } catch (error: any) {
      setFeedback({ type: 'error', message: `アカウントの削除に失敗しました: ${error.message}` });
    }
  };


  const handleNewUserRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!newUserEmail || !newUserPassword || !newDisplayName || !newUsername) {
      setFeedback({ type: 'error', message: 'すべてのフィールドは必須です。' });
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      const token = session?.data.session?.access_token;

      if (!token) {
        setFeedback({ type: 'error', message: '認証エラーが発生しました。再度ログインしてください。' });
        return;
      }

      const response = await fetch('/.netlify/functions/create-user-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          email: newUserEmail, 
          password: newUserPassword,
          displayName: newDisplayName,
          username: newUsername,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'サーバーでエラーが発生しました。');
      }
      
      setFeedback({ type: 'success', message: `ユーザー ${newUserEmail} を登録しました。` });
      setNewUserEmail('');
      setNewUserPassword('');
      setNewDisplayName('');
      setNewUsername('');
    } catch (error: any) {
      setFeedback({ type: 'error', message: `ユーザー登録に失敗しました: ${error.message}` });
    }
  };


  if (loading) {
    return <div className="flex justify-center items-center p-4"><SmallLoadingSpinner /></div>;
  }

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
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
        );
      case 'account':
        return (
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
        );
      case 'user-management':
        return isSuperAdmin ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold border-b border-light-border dark:border-dark-border pb-2">ユーザー管理 (管理者のみ)</h2>
            <form onSubmit={handleNewUserRegistration} className="space-y-4 max-w-lg">
              <div>
                <label htmlFor="newDisplayName" className="block text-sm font-medium mb-1">表示名</label>
                <input
                  id="newDisplayName"
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200"
                  required
                />
              </div>
              <div>
                <label htmlFor="newUsername" className="block text-sm font-medium mb-1">ユーザー名 (ID)</label>
                <input
                  id="newUsername"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200"
                  required
                />
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">半角英数字とアンダースコア(_)のみ使用できます。</p>
              </div>
              <div>
                <label htmlFor="newUserEmail" className="block text-sm font-medium mb-1">新しいユーザーのメールアドレス</label>
                <input
                  id="newUserEmail"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200"
                  required
                />
              </div>
              <div>
                <label htmlFor="newUserPassword" className="block text-sm font-medium mb-1">新しいユーザーのパスワード</label>
                <input
                  id="newUserPassword"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full pl-3 pr-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200"
                  required
                />
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">6文字以上で入力してください。</p>
              </div>
              <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-md bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors">ユーザーを登録</button>
            </form>
          </div>
        ) : null;
      case 'blocked-users':
        return <BlockedUsersList />;
      case 'danger-zone':
        return (
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
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      {/* Sidebar / Navigation */}
      <aside className="w-full md:w-64 bg-light-card dark:bg-dark-card p-6 md:p-8 border-b md:border-r border-light-border dark:border-dark-border shadow-md md:shadow-none">
        <h1 className="text-3xl font-bold mb-8">設定</h1>
        <nav>
          <ul>
            <li className="mb-2">
              <button
                onClick={() => setActiveSection('profile')}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 ${
                  activeSection === 'profile'
                    ? 'bg-light-primary text-white dark:bg-dark-primary dark:text-slate-900'
                    : 'hover:bg-light-hover dark:hover:bg-dark-hover'
                }`}
              >
                プロフィール
              </button>
            </li>
            <li className="mb-2">
              <button
                onClick={() => setActiveSection('account')}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 ${
                  activeSection === 'account'
                    ? 'bg-light-primary text-white dark:bg-dark-primary dark:text-slate-900'
                    : 'hover:bg-light-hover dark:hover:bg-dark-hover'
                }`}
              >
                アカウント
              </button>
            </li>
            <li className="mb-2">
              <button
                onClick={() => setActiveSection('blocked-users')}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 ${
                  activeSection === 'blocked-users'
                    ? 'bg-light-primary text-white dark:bg-dark-primary dark:text-slate-900'
                    : 'hover:bg-light-hover dark:hover:bg-dark-hover'
                }`}
              >
                ブロック中のユーザー
              </button>
            </li>
            {isSuperAdmin && (
              <li className="mb-2">
                <button
                  onClick={() => setActiveSection('user-management')}
                  className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 ${
                    activeSection === 'user-management'
                      ? 'bg-light-primary text-white dark:bg-dark-primary dark:text-slate-900'
                      : 'hover:bg-light-hover dark:hover:bg-dark-hover'
                  }`}
                >
                  ユーザー管理
                </button>
              </li>
            )}
            <li className="mb-2">
              <button
                onClick={() => setActiveSection('danger-zone')}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 ${
                  activeSection === 'danger-zone'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'hover:bg-light-hover dark:hover:bg-dark-hover'
                }`}
              >
                危険な操作
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {feedback && (
          <div className={`p-4 rounded-md mb-6 ${feedback.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}`}>
            {feedback.message}
          </div>
        )}
        {renderSectionContent()}
      </main>

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
