

import React, { useState } from 'react';
import LoadingSpinner from './icons/LoadingSpinner';
import SearchIcon from './icons/SearchIcon';
import type { SearchQuery } from '../types';

interface RestaurantInputProps {
  onSearch: (query: SearchQuery) => void;
  isLoading: boolean;
}

const prefectures = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

const formInputClasses = "mt-1 block w-full px-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-500";


const RestaurantInput: React.FC<RestaurantInputProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState<SearchQuery>({
    prefecture: '',
    city: '',
    storeName: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setQuery(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormInvalid || isLoading) return;
    onSearch(query);
  };
  
  const isFormInvalid = !query.prefecture.trim() || !query.storeName.trim();

  return (
    <div className="bg-light-card dark:bg-dark-card p-6 rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border animate-slide-down">
        <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6 text-center">探したいお店のエリアと店名・キーワードを入力してください。</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prefecture" className="block text-sm font-medium text-light-text dark:text-dark-text">都道府県 <span className="text-red-500">*</span></label>
              <select name="prefecture" id="prefecture" value={query.prefecture} onChange={handleChange} required className={formInputClasses}>
                <option value="">選択してください</option>
                {prefectures.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-light-text dark:text-dark-text">市区町村（任意）</label>
              <input type="text" name="city" id="city" value={query.city} onChange={handleChange} placeholder="例: 渋谷区" className={formInputClasses} />
            </div>
          </div>

          <div>
            <label htmlFor="storeName" className="block text-sm font-medium text-light-text dark:text-dark-text">店名・キーワード（任意）</label>
             <input
                type="text"
                id="storeName"
                name="storeName"
                value={query.storeName}
                onChange={handleChange}
                placeholder="例: 美味しいイタリアン, ラーメン"
                className={formInputClasses}
                disabled={isLoading}
            />
          </div>

          <button
              type="submit"
              disabled={isLoading || !query.prefecture.trim()}
              className="flex items-center justify-center w-full bg-light-primary text-white font-bold px-6 py-3 rounded-lg hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-primary transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
              {isLoading ? (
              <>
                  <LoadingSpinner />
                  <span>検索中...</span>
              </>
              ) : (
              <>
                <SearchIcon className="w-5 h-5 mr-2" />
                <span>お店を検索</span>
              </>
              )}
          </button>
        </form>
    </div>
  );
};

export default RestaurantInput;