

import React, { useState } from 'react';
// FIX: Corrected the import path for ManualAddFormData type from '../App' to '../types'.
import type { ManualAddFormData } from '../types';
import XIcon from './icons/XIcon';

interface ManualAddRestaurantModalProps {
  onClose: () => void;
  onAddRestaurant: (formData: ManualAddFormData) => Promise<void>;
  isAdding: boolean;
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

const ManualAddRestaurantModal: React.FC<ManualAddRestaurantModalProps> = ({ onClose, onAddRestaurant, isAdding }) => {
  const [formData, setFormData] = useState<ManualAddFormData>({
    name: '',
    prefecture: '',
    city: '',
    address: '',
    hours: '',
    priceRange: '',
    website: '',
    genres: [],
  });
  const [genresInput, setGenresInput] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleGenresChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setGenresInput(value); // Keep the user's raw input for the display value
    // Split by comma (half/full-width), trim whitespace, and filter out empty strings for the data
    const genresArray = value.split(/[,、]/).map(g => g.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, genres: genresArray }));
  };

  const formatPriceInput = (input: string): string => {
    if (!input.trim()) return '';
    const parts = input.match(/\d+/g);
    if (!parts) return '';

    if (parts.length === 1) {
      return `¥${parseInt(parts[0], 10).toLocaleString()}`;
    }
    
    const min = parseInt(parts[0], 10);
    const max = parseInt(parts[1], 10);
    return `¥${min.toLocaleString()} ~ ¥${max.toLocaleString()}`;
  };

  const handlePriceRangeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const formattedPrice = formatPriceInput(e.target.value);
    setFormData(prev => ({ ...prev, priceRange: formattedPrice }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormInvalid || isAdding) return;
    await onAddRestaurant(formData);
  };

  const isFormInvalid = !formData.name.trim() || !formData.prefecture.trim() || !formData.city.trim();
  
  const formInputClasses = "mt-1 block w-full px-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-500";


  return (
    <div 
      className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-light-card dark:bg-dark-card rounded-ui-medium shadow-soft-lg w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">新しいお店を追加</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <XIcon className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
          </button>
        </header>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Form fields */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-light-text dark:text-dark-text">店名 <span className="text-red-500">*</span></label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className={formInputClasses} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prefecture" className="block text-sm font-medium text-light-text dark:text-dark-text">都道府県 <span className="text-red-500">*</span></label>
              <select name="prefecture" id="prefecture" value={formData.prefecture} onChange={handleChange} required className={formInputClasses}>
                <option value="">選択してください</option>
                {prefectures.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-light-text dark:text-dark-text">市区町村 <span className="text-red-500">*</span></label>
              <input type="text" name="city" id="city" value={formData.city} onChange={handleChange} required className={formInputClasses} />
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-light-text dark:text-dark-text">住所（任意）</label>
            <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className={formInputClasses} />
          </div>
          
          <div>
            <label htmlFor="hours" className="block text-sm font-medium text-light-text dark:text-dark-text">営業時間（任意）</label>
            <input type="text" name="hours" id="hours" value={formData.hours} onChange={handleChange} className={formInputClasses} />
          </div>

          <div>
            <label htmlFor="priceRange" className="block text-sm font-medium text-light-text dark:text-dark-text">料金帯（任意）</label>
            <input type="text" name="priceRange" id="priceRange" value={formData.priceRange || ''} onChange={handleChange} onBlur={handlePriceRangeBlur} placeholder="例: 1000,2000" className={formInputClasses} />
          </div>
          
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-light-text dark:text-dark-text">ウェブサイト（任意）</label>
            <input type="url" name="website" id="website" value={formData.website} onChange={handleChange} placeholder="https://example.com" className={formInputClasses} />
          </div>
          
          <div>
            <label htmlFor="genres" className="block text-sm font-medium text-light-text dark:text-dark-text">ジャンル（任意）</label>
            <input type="text" name="genres" id="genres" value={genresInput} onChange={handleGenresChange} placeholder="例: ラーメン, 居酒屋, カフェ" className={formInputClasses} />
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">カンマ (,) や読点 (、) 区切りで複数入力できます。</p>
          </div>
        </form>
        
        <footer className="flex justify-end items-center gap-3 p-4 border-t border-light-border dark:border-dark-border">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-md text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
          >
            キャンセル
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit} 
            disabled={isAdding || isFormInvalid}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? '追加中...' : 'お気に入りに追加'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ManualAddRestaurantModal;