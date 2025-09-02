import React, { useState, useEffect } from 'react';
import LoadingSpinner from './icons/LoadingSpinner';

const MonitoringView: React.FC = () => {
  const [supabaseUsage, setSupabaseUsage] = useState<any>(null);
  const [geminiUsage, setGeminiUsage] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [supabaseResponse, geminiResponse] = await Promise.all([
          fetch('/.netlify/functions/get-supabase-usage'),
          fetch('/.netlify/functions/get-gemini-usage'),
        ]);

        if (supabaseResponse.ok) {
          const supabaseData = await supabaseResponse.json();
          setSupabaseUsage(supabaseData);
        }

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          setGeminiUsage(geminiData);
        }

      } catch (err: any) {
        setError(err.message);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="bg-light-card dark:bg-dark-card p-6 rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border">
      <h3 className="text-lg font-semibold mb-4">サービス利用状況</h3>
      {isLoading && <LoadingSpinner />}
      {error && <div className="p-4 my-4 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 rounded-md">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h4 className="font-semibold">Netlify</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">無料利用枠</p>
          <p className="text-2xl font-bold">N/A</p>
          <p className="text-xs text-gray-500">NetlifyのAPIでは使用量を取得できません。</p>
        </div>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h4 className="font-semibold">Gemini API</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">今日の利用回数</p>
          <p className="text-2xl font-bold">{geminiUsage[0]?.usage_count || 0}</p>
        </div>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h4 className="font-semibold">Supabase</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">DBサイズ</p>
          <p className="text-2xl font-bold">{supabaseUsage ? `${(supabaseUsage.db_size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};

export default MonitoringView;