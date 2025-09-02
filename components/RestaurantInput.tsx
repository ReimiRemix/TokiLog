import React, { useState, useEffect } from 'react';
import LoadingSpinner from './icons/LoadingSpinner';
import SearchIcon from './icons/SearchIcon';
import type { SearchQuery } from '../types';

interface RestaurantInputProps {
  onSearch: (query: SearchQuery) => void;
  isLoading: boolean;
}

const prefectures: { name: string; code: string; }[] = [
    { name: '北海道', code: 'Z011' },
    { name: '青森県', code: 'Z012' },
    { name: '岩手県', code: 'Z013' },
    { name: '宮城県', code: 'Z014' },
    { name: '秋田県', code: 'Z015' },
    { name: '山形県', code: 'Z016' },
    { name: '福島県', code: 'Z017' },
    { name: '茨城県', code: 'Z021' },
    { name: '栃木県', code: 'Z022' },
    { name: '群馬県', code: 'Z023' },
    { name: '埼玉県', code: 'Z024' },
    { name: '千葉県', code: 'Z025' },
    { name: '東京都', code: 'Z026' },
    { name: '神奈川県', code: 'Z027' },
    { name: '新潟県', code: 'Z031' },
    { name: '富山県', code: 'Z032' },
    { name: '石川県', code: 'Z033' },
    { name: '福井県', code: 'Z034' },
    { name: '山梨県', code: 'Z035' },
    { name: '長野県', code: 'Z036' },
    { name: '岐阜県', code: 'Z041' },
    { name: '静岡県', code: 'Z042' },
    { name: '愛知県', code: 'Z043' },
    { name: '三重県', code: 'Z044' },
    { name: '滋賀県', code: 'Z051' },
    { name: '京都府', code: 'Z052' },
    { name: '大阪府', code: 'Z053' },
    { name: '兵庫県', code: 'Z054' },
    { name: '奈良県', code: 'Z055' },
    { name: '和歌山県', code: 'Z056' },
    { name: '鳥取県', code: 'Z061' },
    { name: '島根県', code: 'Z062' },
    { name: '岡山県', code: 'Z063' },
    { name: '広島県', code: 'Z064' },
    { name: '山口県', code: 'Z065' },
    { name: '徳島県', code: 'Z071' },
    { name: '香川県', code: 'Z072' },
    { name: '愛媛県', code: 'Z073' },
    { name: '高知県', code: 'Z074' },
    { name: '福岡県', code: 'Z081' },
    { name: '佐賀県', code: 'Z082' },
    { name: '長崎県', code: 'Z083' },
    { name: '熊本県', code: 'Z084' },
    { name: '大分県', code: 'Z085' },
    { name: '宮崎県', code: 'Z086' },
    { name: '鹿児島県', code: 'Z087' },
    { name: '沖縄県', code: 'Z088' },
];

const largeAreaMapping: { [key: string]: string } = {
    '北海道': 'Z01',
    '青森県': 'Z02', '岩手県': 'Z02', '宮城県': 'Z02', '秋田県': 'Z02', '山形県': 'Z02', '福島県': 'Z02',
    '茨城県': 'Z03', '栃木県': 'Z03', '群馬県': 'Z03', '埼玉県': 'Z03', '千葉県': 'Z03', '東京都': 'Z03', '神奈川県': 'Z03',
    '新潟県': 'Z04', '富山県': 'Z04', '石川県': 'Z04', '福井県': 'Z04',
    '山梨県': 'Z05', '長野県': 'Z05',
    '岐阜県': 'Z06', '静岡県': 'Z06', '愛知県': 'Z06', '三重県': 'Z06',
    '滋賀県': 'Z07', '京都府': 'Z07', '大阪府': 'Z07', '兵庫県': 'Z07', '奈良県': 'Z07', '和歌山県': 'Z07',
    '鳥取県': 'Z08', '島根県': 'Z08', '岡山県': 'Z08', '広島県': 'Z08', '山口県': 'Z08',
    '徳島県': 'Z09', '香川県': 'Z09', '愛媛県': 'Z09', '高知県': 'Z09',
    '福岡県': 'Z10', '佐賀県': 'Z10', '長崎県': 'Z10', '熊本県': 'Z10', '大分県': 'Z10', '宮崎県': 'Z10', '鹿児島県': 'Z10',
    '沖縄県': 'Z11',
};

const formInputClasses = "mt-1 block w-full px-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-500";

const RestaurantInput: React.FC<RestaurantInputProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState<SearchQuery>({
    prefecture: '',
    middle_area_code: '',
    genre: '',
    storeName: '',
  });
  const [middleAreas, setMiddleAreas] = useState<{ code: string; name: string; }[]>([]);
  const [genres, setGenres] = useState<{ code: string; name: string; }[]>([]);
  const [isAreaLoading, setIsAreaLoading] = useState(false);
  const [isGenreLoading, setIsGenreLoading] = useState(false);

  useEffect(() => {
    const fetchGenres = async () => {
      setIsGenreLoading(true);
      try {
        const response = await fetch('/.netlify/functions/hotpepper-genre-master');
        if (response.ok) {
          const data = await response.json();
          setGenres(data);
        }
      } catch (error) {
        console.error("Failed to fetch genres", error);
      }
      setIsGenreLoading(false);
    };
    fetchGenres();
  }, []);

  const handlePrefectureChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prefectureName = e.target.value;
    setQuery({ ...query, prefecture: prefectureName, middle_area_code: '' });
    setMiddleAreas([]);

    if (prefectureName) {
      const largeAreaCode = largeAreaMapping[prefectureName];
      console.log('RestaurantInput.tsx - largeAreaCode:', largeAreaCode);
      if (largeAreaCode) {
        setIsAreaLoading(true);
        try {
          const response = await fetch(`/.netlify/functions/hotpepper-area-search?large_area_code=${largeAreaCode}`);
          if (response.ok) {
            const data = await response.json();
            console.log('RestaurantInput.tsx - fetched middleAreas data:', data);
            setMiddleAreas(data);
          }
        } catch (error) {
          console.error("Failed to fetch middle areas", error);
        }
        setIsAreaLoading(false);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setQuery(prev => ({ ...prev, [name]: value }));
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="prefecture" className="block text-sm font-medium text-light-text dark:text-dark-text">都道府県 <span className="text-red-500">*</span></label>
              <select name="prefecture" id="prefecture" value={query.prefecture} onChange={handlePrefectureChange} required className={formInputClasses}>
                <option value="">選択してください</option>
                {prefectures.map(p => <option key={p.code} value={p.name}>{p.name}</option>)}              
              </select>
            </div>
            <div>
              <label htmlFor="middle_area_code" className="block text-sm font-medium text-light-text dark:text-dark-text">市区町村</label>
              <select name="middle_area_code" id="middle_area_code" value={query.middle_area_code} onChange={handleChange} disabled={isAreaLoading || middleAreas.length === 0} className={formInputClasses}>
                <option value="">指定しない</option>
                {middleAreas.map(area => <option key={area.code} value={area.code}>{area.name}</option>)}              
              </select>
            </div>
            <div>
              <label htmlFor="genre" className="block text-sm font-medium text-light-text dark:text-dark-text">ジャンル</label>
              <select name="genre" id="genre" value={query.genre} onChange={handleChange} disabled={isGenreLoading} className={formInputClasses}>
                <option value="">指定しない</option>
                {genres.map(g => <option key={g.code} value={g.code}>{g.name}</option>)}              
              </select>
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
