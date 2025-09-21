import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import SmallLoadingSpinner from './icons/SmallLoadingSpinner';
import ConfirmationModal from './ConfirmationModal';
import BlockedUsersList from './BlockedUsersList';
import { twMerge } from 'tailwind-merge';

type SettingSection = 'profile' | 'account' | 'user-management' | 'blocked-users' | 'danger-zone';

const SettingCard: React.FC<{title: string, description: string, children: React.ReactNode}> = ({title, description, children}) => (
  <div className="bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-soft border border-light-border dark:border-dark-border">
    <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">{title}</h3>
    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1 mb-6">{description}</p>
    {children}
  </div>
);

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

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUsername, setNewUsername] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [isLoadingCsv, setIsLoadingCsv] = useState(false);
  const [results, setResults] = useState<{ email: string; status: string; error?: string; }[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsLoadingCsv(true);
    setResults([]);
    setParseErrors([]);
    setCsvError(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64String = reader.result?.toString().split(',')[1];
        if (!base64String) {
          setCsvError('ファイルの読み込みに失敗しました。');
          setIsLoadingCsv(false);
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setCsvError('認証されていません。');
          setIsLoadingCsv(false);
          return;
        }
        const response = await fetch('/.netlify/functions/bulk-register-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: base64String,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '一括登録に失敗しました。');
        setResults(data.results || []);
        setParseErrors(data.parseErrors || []);
      } catch (err: any) {
        setCsvError(err.message);
      }
      setIsLoadingCsv(false);
    };
    reader.onerror = () => {
      setCsvError('ファイルの読み込み中にエラーが発生しました。');
      setIsLoadingCsv(false);
    };
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFeedback(null);
    const { error } = await supabase.from('user_profiles').update({ display_name: displayName, username: username }).eq('id', user.id);
    if (error) setFeedback({ type: 'error', message: `プロフィールの更新に失敗しました: ${error.message}` });
    else setFeedback({ type: 'success', message: 'プロフィールを更新しました。' });
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const { error } = await supabase.auth.updateUser({ email });
    if (error) setFeedback({ type: 'error', message: `メールアドレスの更新に失敗しました: ${error.message}` });
    else setFeedback({ type: 'success', message: '確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。' });
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
      const response = await fetch('/.netlify/functions/delete-user-account', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email: newUserEmail, password: newUserPassword, displayName: newDisplayName, username: newUsername }),
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
    return <div className="flex justify-center items-center p-8"><SmallLoadingSpinner /></div>;
  }

  const formInputClasses = "w-full pl-3 pr-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200";
  const formButtonClasses = "px-5 py-2 text-sm font-semibold rounded-md bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors";

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">プロフィール設定</h2>
            <SettingCard title="基本情報" description="他のユーザーに表示される名前です。">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium mb-1">表示名</label>
                  <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={formInputClasses} />
                </div>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium mb-1">ユーザー名 (ID)</label>
                  <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className={formInputClasses} />
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">半角英数字とアンダースコア(_)のみ使用できます。</p>
                </div>
                <div className="pt-2"><button type="submit" className={formButtonClasses}>プロフィールを更新</button></div>
              </form>
            </SettingCard>
          </div>
        );
      case 'account':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">アカウント設定</h2>
            <SettingCard title="メールアドレス" description="ログインに使用するメールアドレスを変更します。変更後、確認メールが送信されます。">
              <form onSubmit={handleEmailUpdate} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">メールアドレス</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={formInputClasses} />
                </div>
                <div className="pt-2"><button type="submit" className={formButtonClasses}>メールアドレスを更新</button></div>
              </form>
            </SettingCard>
            <SettingCard title="パスワード" description="新しいパスワードを設定します。セキュリティのため、定期的な変更をおすすめします。">
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">新しいパスワード</label>
                  <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={formInputClasses} />
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">6文字以上で入力してください。</p>
                </div>
                <div className="pt-2"><button type="submit" className={formButtonClasses}>パスワードを更新</button></div>
              </form>
            </SettingCard>
          </div>
        );
      case 'user-management':
        return isSuperAdmin ? (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">ユーザー管理 (管理者)</h2>
            <SettingCard title="新しいユーザーを登録" description="新しいユーザーアカウントを手動で作成します。">
              <form onSubmit={handleNewUserRegistration} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="newDisplayName" className="block text-sm font-medium mb-1">表示名</label>
                    <input id="newDisplayName" type="text" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} className={formInputClasses} required />
                  </div>
                  <div>
                    <label htmlFor="newUsername" className="block text-sm font-medium mb-1">ユーザー名 (ID)</label>
                    <input id="newUsername" type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className={formInputClasses} required />
                  </div>
                  <div>
                    <label htmlFor="newUserEmail" className="block text-sm font-medium mb-1">メールアドレス</label>
                    <input id="newUserEmail" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className={formInputClasses} required />
                  </div>
                  <div>
                    <label htmlFor="newUserPassword" className="block text-sm font-medium mb-1">パスワード</label>
                    <input id="newUserPassword" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} className={formInputClasses} required />
                  </div>
                </div>
                <div className="pt-2"><button type="submit" className={formButtonClasses}>ユーザーを登録</button></div>
              </form>
            </SettingCard>
            <SettingCard title="CSVでユーザーを一括登録" description="CSVファイルを使って、複数のユーザーを一度に登録します。">
              <div className="mb-4 p-4 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 rounded-md">
                <p className="font-semibold">CSVフォーマット:</p>
                <p>CSVファイルには、<code className="font-mono">email,password,display_name,username</code> のヘッダー行が必要です。</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="csv-upload" className="block text-sm font-medium">CSVファイル</label>
                  <input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-light-primary-soft-bg file:text-light-primary dark:file:bg-dark-primary-soft-bg dark:file:text-dark-primary hover:file:bg-light-primary-hover" />
                </div>
                <button onClick={handleUpload} disabled={!file || isLoadingCsv} className={twMerge(formButtonClasses, "w-full justify-center flex items-center gap-2 py-3")}>
                  {isLoadingCsv ? <><SmallLoadingSpinner /><span>登録中...</span></> : '登録実行'}
                </button>
              </div>
            </SettingCard>
            {(results.length > 0 || parseErrors.length > 0 || csvError) && (
              <SettingCard title="一括登録の結果" description="CSVファイルのアップロードと登録処理の結果です。">
                {csvError && <div className="p-4 my-2 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 rounded-md">{csvError}</div>}
                {parseErrors.length > 0 && (
                  <div className="my-2">
                    <h4 className="font-semibold">解析エラー:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                      {parseErrors.map((err, index) => <li key={index}>{err}</li>)}
                    </ul>
                  </div>
                )}
                {results.length > 0 && (
                  <div className="my-2">
                    <h4 className="font-semibold">登録ステータス:</h4>
                    <ul className="space-y-2 text-sm">
                      {results.map((result, index) => (
                        <li key={index} className={`p-2 rounded-md ${result.status === 'success' ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                          <p className="font-semibold">{result.email} - <span className={result.status === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>{result.status}</span></p>
                          {result.error && <p className="text-xs">エラー: {result.error}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </SettingCard>
            )}
          </div>
        ) : null;
      case 'blocked-users':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">ブロック中のユーザー</h2>
            <SettingCard title="ブロックリスト" description="ブロックしたユーザーの一覧です。ブロックを解除すると、相手は再度あなたをフォローしたり、お気に入りを見ることができるようになります。">
              <BlockedUsersList />
            </SettingCard>
          </div>
        );
      case 'danger-zone':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-red-600 dark:text-red-400">危険な操作</h2>
            <div className="p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-500/50 rounded-xl">
              <h3 className="text-xl font-bold text-red-800 dark:text-red-300">アカウントの削除</h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-2 mb-5">
                この操作は元に戻せません。あなたのお気に入り、フォロー情報、プロフィールなど、すべてのアカウントデータが完全に削除されます。
              </p>
              <button onClick={() => setIsDeleteModalOpen(true)} className="px-5 py-2 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors">
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
    <div className="flex flex-col md:flex-row animate-slide-down">
      <aside className="w-full md:w-64 bg-light-card dark:bg-dark-card p-4 md:border-r border-b md:border-b-0 border-light-border dark:border-dark-border">
        <h1 className="text-2xl font-bold mb-6 px-2">設定</h1>
        <nav className="space-y-1">
          <button onClick={() => setActiveSection('profile')} className={twMerge("w-full text-left px-3 py-2 rounded-lg font-semibold transition-colors", activeSection === 'profile' ? 'bg-light-primary-soft-bg text-light-primary dark:bg-dark-primary-soft-bg dark:text-dark-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50')}>
            プロフィール
          </button>
          <button onClick={() => setActiveSection('account')} className={twMerge("w-full text-left px-3 py-2 rounded-lg font-semibold transition-colors", activeSection === 'account' ? 'bg-light-primary-soft-bg text-light-primary dark:bg-dark-primary-soft-bg dark:text-dark-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50')}>
            アカウント
          </button>
          <button onClick={() => setActiveSection('blocked-users')} className={twMerge("w-full text-left px-3 py-2 rounded-lg font-semibold transition-colors", activeSection === 'blocked-users' ? 'bg-light-primary-soft-bg text-light-primary dark:bg-dark-primary-soft-bg dark:text-dark-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50')}>
            ブロック中のユーザー
          </button>
          {isSuperAdmin && (
            <button onClick={() => setActiveSection('user-management')} className={twMerge("w-full text-left px-3 py-2 rounded-lg font-semibold transition-colors", activeSection === 'user-management' ? 'bg-light-primary-soft-bg text-light-primary dark:bg-dark-primary-soft-bg dark:text-dark-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50')}>
              ユーザー管理
            </button>
          )}
          <button onClick={() => setActiveSection('danger-zone')} className={twMerge("w-full text-left px-3 py-2 rounded-lg font-semibold transition-colors", activeSection === 'danger-zone' ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50')}>
            危険な操作
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-8">
        {feedback && (
          <div className={`p-4 rounded-lg mb-6 ${feedback.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}`}>
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
        confirmText="完全に削除する"
        isDestructive
      >
        <p>本当にアカウントを削除しますか？この操作は取り消すことができず、すべてのデータが永久に失われます。</p>
      </ConfirmationModal>
    </div>
  );
};

export default SettingsPage;