import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './icons/LoadingSpinner';

const AdminPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ email: string; status: string; error?: string; }[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    setResults([]);
    setParseErrors([]);
    setError(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64String = reader.result?.toString().split(',')[1];
        if (!base64String) {
          setError('ファイルの読み込みに失敗しました。');
          setIsLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('認証されていません。');
          setIsLoading(false);
          return;
        }

        const response = await fetch('/.netlify/functions/bulk-register-users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: base64String,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '一括登録に失敗しました。');
        }

        setResults(data.results || []);
        setParseErrors(data.parseErrors || []);
      } catch (err: any) {
        setError(err.message);
      }
      setIsLoading(false);
    };
    reader.onerror = () => {
      setError('ファイルの読み込み中にエラーが発生しました。');
      setIsLoading(false);
    };
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">ユーザー管理</h2>
      <div className="bg-light-card dark:bg-dark-card p-6 rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border">
        <h3 className="text-lg font-semibold mb-4">CSVでユーザーを一括登録</h3>
        <div className="mb-4 p-4 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 rounded-md">
          <p className="font-semibold">CSVフォーマット:</p>
          <p>CSVファイルには、以下のヘッダー行が必要です:</p>
          <code className="block bg-slate-200 dark:bg-slate-700 p-2 rounded-md mt-2 text-sm">email,password,display_name,username</code>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="csv-upload" className="block text-sm font-medium text-light-text dark:text-dark-text">CSVファイル</label>
            <input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-light-primary-soft-bg file:text-light-primary dark:file:bg-dark-primary-soft-bg dark:file:text-dark-primary hover:file:bg-light-primary-hover" />
          </div>
          <button onClick={handleUpload} disabled={!file || isLoading} className="flex items-center justify-center w-full bg-light-primary text-white font-bold px-6 py-3 rounded-lg hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-primary transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? <><LoadingSpinner /><span>登録中...</span></> : '登録実行'}
          </button>
        </div>
      </div>

      {error && <div className="p-4 my-4 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 rounded-md">{error}</div>}

      {results.length > 0 && (
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border">
          <h3 className="text-lg font-semibold mb-4">登録結果</h3>
          <ul className="space-y-2">
            {results.map((result, index) => (
              <li key={index} className={`p-2 rounded-md ${result.status === 'success' ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                <p className="font-semibold">{result.email}</p>
                <p>ステータス: {result.status}</p>
                {result.error && <p>エラー: {result.error}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {parseErrors.length > 0 && (
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border">
          <h3 className="text-lg font-semibold mb-4">解析エラー</h3>
          <ul className="space-y-2">
            {parseErrors.map((err, index) => (
              <li key={index} className="p-2 rounded-md bg-yellow-100 dark:bg-yellow-900/50">
                <p>{err}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
