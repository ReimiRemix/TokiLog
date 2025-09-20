import React, { useState, useEffect } from 'react';
import LoadingSpinner from './icons/LoadingSpinner';
import SearchIcon from './icons/SearchIcon';
import type { SearchQuery } from '../types';

interface RestaurantInputProps {
  onSearch: (query: SearchQuery) => void;
  isLoading: boolean;
}

const prefectures: { name: string; code: string; }[] = [
    { name: '北海道', code: 'PREF01' },
    { name: '青森県', code: 'PREF02' },
    { name: '岩手県', code: 'PREF03' },
    { name: '宮城県', code: 'PREF04' },
    { name: '秋田県', code: 'PREF05' },
    { name: '山形県', code: 'PREF06' },
    { name: '福島県', code: 'PREF07' },
    { name: '茨城県', code: 'PREF08' },
    { name: '栃木県', code: 'PREF09' },
    { name: '群馬県', code: 'PREF10' },
    { name: '埼玉県', code: 'PREF11' },
    { name: '千葉県', code: 'PREF12' },
    { name: '東京都', code: 'PREF13' },
    { name: '神奈川県', code: 'PREF14' },
    { name: '新潟県', code: 'PREF15' },
    { name: '富山県', code: 'PREF16' },
    { name: '石川県', code: 'PREF17' },
    { name: '福井県', code: 'PREF18' },
    { name: '山梨県', code: 'PREF19' },
    { name: '長野県', code: 'PREF20' },
    { name: '岐阜県', code: 'PREF21' },
    { name: '静岡県', code: 'PREF22' },
    { name: '愛知県', code: 'PREF23' },
    { name: '三重県', code: 'PREF24' },
    { name: '滋賀県', code: 'PREF25' },
    { name: '京都府', code: 'PREF26' },
    { name: '大阪府', code: 'PREF27' },
    { name: '兵庫県', code: 'PREF28' },
    { name: '奈良県', code: 'PREF29' },
    { name: '和歌山県', code: 'PREF30' },
    { name: '鳥取県', code: 'PREF31' },
    { name: '島根県', code: 'PREF32' },
    { name: '岡山県', code: 'PREF33' },
    { name: '広島県', code: 'PREF34' },
    { name: '山口県', code: 'PREF35' },
    { name: '徳島県', code: 'PREF36' },
    { name: '香川県', code: 'PREF37' },
    { name: '愛媛県', code: 'PREF38' },
    { name: '高知県', code: 'PREF39' },
    { name: '福岡県', code: 'PREF40' },
    { name: '佐賀県', code: 'PREF41' },
    { name: '長崎県', code: 'PREF42' },
    { name: '熊本県', code: 'PREF43' },
    { name: '大分県', code: 'PREF44' },
    { name: '宮崎県', code: 'PREF45' },
    { name: '鹿児島県', code: 'PREF46' },
    { name: '沖縄県', code: 'PREF47' },
];

const formInputClasses = "mt-1 block w-full px-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-500";

const RestaurantInput: React.FC<RestaurantInputProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState<SearchQuery>({
    prefecture: '',
    prefecture_code: '',
    small_area_code: '',
    small_area_text: '',
    genre: '',
    genre_text: '',
    storeName: '',
  });

  const handlePrefectureChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prefectureName = e.target.value;
    const selectedPrefecture = prefectures.find(p => p.name === prefectureName);
    const prefectureCode = selectedPrefecture ? selectedPrefecture.code : '';

    setQuery({ ...query, prefecture: prefectureName, prefecture_code: prefectureCode, small_area_code: '', small_area_text: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setQuery(prev => ({
      ...prev,
      [name]: value,
      // ジャンルと市区町村のコードはフリーテキスト入力時はクリア
      ...(name === 'genre_text' && { genre: '' }),
      ...(name === 'small_area_text' && { small_area_code: '' }),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.prefecture.trim() || isLoading) return;
    onSearch(query);
  };
  
  const isFormInvalid = !query.prefecture.trim();

  return (
    <div className="bg-light-card dark:bg-dark-card p-6 rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border animate-slide-down">
        <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6 text-center">探したいお店のエリアと店名・キーワードを入力してください。</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <fieldset className="space-y-4 p-4 border border-light-border dark:border-dark-border rounded-lg">
              <legend className="text-base font-semibold text-light-text dark:text-dark-text px-2">エリア</legend>
              <div>
                <label htmlFor="prefecture" className="block text-sm font-medium text-light-text dark:text-dark-text">都道府県 <span className="text-red-500">*</span></label>
                <select name="prefecture" id="prefecture" value={query.prefecture} onChange={handlePrefectureChange} required className={formInputClasses}>
                  <option value="">選択してください</option>
                  {prefectures.map(p => <option key={p.code} value={p.name}>{p.name}</option>)}              
                </select>
              </div>
              <div>
                <label htmlFor="small_area_text" className="block text-sm font-medium text-light-text dark:text-dark-text">市区町村</label>
                <input
                  type="text"
                  id="small_area_text"
                  name="small_area_text"
                  value={query.small_area_text}
                  onChange={handleChange}
                  placeholder="例: 新宿, 渋谷" 
                  className={formInputClasses}
                  disabled={isLoading || !query.prefecture.trim()}
                />
              </div>
            </fieldset>

            <fieldset className="space-y-4 p-4 border border-light-border dark:border-dark-border rounded-lg">
              <legend className="text-base font-semibold text-light-text dark:text-dark-text px-2">お店の種類</legend>
              <div>
                <label htmlFor="genre_text" className="block text-sm font-medium text-light-text dark:text-dark-text">ジャンル</label>
                <input
                  type="text"
                  id="genre_text"
                  name="genre_text"
                  value={query.genre_text}
                  onChange={handleChange}
                  placeholder="例: イタリアン, ラーメン" 
                  className={formInputClasses}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="storeName" className="block text-sm font-medium text-light-text dark:text-dark-text">店名・キーワード</label>
                <input
                    type="text"
                    id="storeName"
                    name="storeName"
                    value={query.storeName}
                    onChange={handleChange}
                    placeholder="例: 美味しいイタリアン"
                    className={formInputClasses}
                    disabled={isLoading}
                />
              </div>
            </fieldset>
          </div>

          <div className="pt-4 flex justify-end">
            <button
                type="submit"
                disabled={isLoading || !query.prefecture.trim()}
                className="flex items-center justify-center w-full md:w-auto bg-light-primary text-white font-bold px-8 py-3 rounded-lg hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-primary transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        </form>
    </div>
  );
};

export default RestaurantInput;
