import React, { useState, useEffect, useMemo } from 'react';
import LoadingSpinner from './icons/LoadingSpinner';

// Gemini API の利用状況データの型定義
interface GeminiApiUsage {
  api_type: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_requests: number;
}

const MonitoringView: React.FC = () => {
  const [supabaseUsage, setSupabaseUsage] = useState<any>(null);
  const [geminiUsage, setGeminiUsage] = useState<GeminiApiUsage[]>([]); // 型を変更
  const [netlifyUsage, setNetlifyUsage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [supabaseResponse, geminiResponse, netlifyResponse] = await Promise.all([
          fetch('/.netlify/functions/get-supabase-usage'),
          fetch('/.netlify/functions/get-gemini-usage'),
          fetch('/.netlify/functions/get-netlify-usage'),
        ]);

        if (supabaseResponse.ok) {
          const supabaseData = await supabaseResponse.json();
          setSupabaseUsage(supabaseData);
        }

        if (geminiResponse.ok) {
          const geminiData: GeminiApiUsage[] = await geminiResponse.json(); // 型アサーション
          setGeminiUsage(geminiData);
        }

        if (netlifyResponse.ok) {
          const netlifyData = await netlifyResponse.json();
          setNetlifyUsage(netlifyData);
        } else {
          console.error('Failed to fetch Netlify usage:', await netlifyResponse.text());
        }

      } catch (err: any) {
        setError(err.message);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Geminiトークン使用量の合計を計算
  const totalGeminiInputTokens = useMemo(() => {
    return geminiUsage.reduce((sum, item) => sum + (item.total_input_tokens || 0), 0);
  }, [geminiUsage]);

  const totalGeminiOutputTokens = useMemo(() => {
    return geminiUsage.reduce((sum, item) => sum + (item.total_output_tokens || 0), 0);
  }, [geminiUsage]);

  const totalGeminiTokens = useMemo(() => {
    return totalGeminiInputTokens + totalGeminiOutputTokens;
  }, [totalGeminiInputTokens, totalGeminiOutputTokens]);


  return (
    <div className="bg-light-card dark:bg-dark-card p-6 rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border">
      <h3 className="text-lg font-semibold mb-4">サービス利用状況</h3>
      {isLoading && <LoadingSpinner />}
      {error && <div className="p-4 my-4 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 rounded-md">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h4 className="font-semibold">Netlify</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">今月の利用帯域</p>
          {netlifyUsage ? (
            <>
              <p className="text-2xl font-bold">
                {formatBytes(netlifyUsage.used)} / {formatBytes(netlifyUsage.included)}
              </p>
              <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2.5 mt-2">
                <div 
                  className="bg-blue-500 h-2.5 rounded-full" 
                  style={{ width: `${(netlifyUsage.used / netlifyUsage.included) * 100}%` }}
                ></div>
              </div>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold">N/A</p>
              <p className="text-xs text-gray-500">使用量を取得できませんでした。</p>
            </>
          )}
        </div>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h4 className="font-semibold">Gemini API</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">今日のトークン利用量</p>
          <p className="text-xl font-bold">合計: {totalGeminiTokens}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">入力: {totalGeminiInputTokens}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">出力: {totalGeminiOutputTokens}</p>
        </div>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h4 className="font-semibold">Supabase</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">DB利用サイズ</p>
          {supabaseUsage ? (
            <>
              <p className="text-2xl font-bold">
                {formatBytes(supabaseUsage.db_size)} / 500 MB
              </p>
              <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2.5 mt-2">
                <div 
                  className="bg-green-500 h-2.5 rounded-full" 
                  style={{ width: `${(supabaseUsage.db_size / (500 * 1024 * 1024)) * 100}%` }}
                ></div>
              </div>
            </>
          ) : (
            <p className="text-2xl font-bold">N/A</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitoringView;