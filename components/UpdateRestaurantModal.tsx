
import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Restaurant, RestaurantDetails, Source } from '../types';
import XIcon from './icons/XIcon';
import SmallLoadingSpinner from './icons/SmallLoadingSpinner';
import ExternalLinkIcon from './icons/ExternalLinkIcon';

interface UpdateRestaurantModalProps {
  restaurant: Restaurant;
  onClose: () => void;
  onConfirmUpdate: (id: string, updatedData: Partial<Restaurant>) => void;
}

interface FetchResult {
  details: RestaurantDetails[] | null;
  sources: Source[];
}

const UpdateRestaurantModal: React.FC<UpdateRestaurantModalProps> = ({ restaurant, onClose, onConfirmUpdate }) => {
  const searchRestaurantMutation = useMutation({
    mutationFn: async (restaurantToSearch: Restaurant) => {
      const response = await fetch('/.netlify/functions/gemini-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefecture: restaurantToSearch.prefecture,
          city: restaurantToSearch.city,
          storeName: restaurantToSearch.name,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '情報の取得に失敗しました。');
      }
      return (await response.json()) as FetchResult;
    },
  });

  useEffect(() => {
    searchRestaurantMutation.mutate(restaurant);
  }, [restaurant]);

  const handleUpdateClick = (match: RestaurantDetails) => {
    const updatedData: Partial<Restaurant> = {
      name: match.name || restaurant.name,
      address: match.address || restaurant.address,
      hours: match.hours || restaurant.hours,
      latitude: match.latitude !== null ? match.latitude : restaurant.latitude,
      longitude: match.longitude !== null ? match.longitude : restaurant.longitude,
      prefecture: match.prefecture || restaurant.prefecture,
      city: match.city || restaurant.city,
      website: match.website || restaurant.website,
      priceRange: match.priceRange || restaurant.priceRange,
      isClosed: match.isClosed !== undefined ? match.isClosed : restaurant.isClosed,
    };
    onConfirmUpdate(restaurant.id, updatedData);
    onClose();
  };
  
  const getSafeHostname = (uri: string | undefined | null): string => {
    if (!uri) return '不明なソース';
    try {
      const fullUrl = uri.startsWith('http') ? uri : `https://${uri}`;
      return new URL(fullUrl).hostname;
    } catch (e) {
      return uri;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-light-card dark:bg-dark-card rounded-ui-medium shadow-soft-lg w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-down" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">情報の更新: {restaurant.name}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <XIcon className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
          </button>
        </header>

        <div className="p-6 overflow-y-auto">
          {searchRestaurantMutation.isPending && (
            <div className="flex flex-col items-center justify-center h-64">
              <SmallLoadingSpinner />
              <p className="mt-4 text-light-text-secondary dark:text-dark-text-secondary">AIで最新情報を検索中...</p>
            </div>
          )}

          {searchRestaurantMutation.isError && (
            <div className="text-center h-64 flex flex-col justify-center items-center">
              <p className="text-red-500">エラーが発生しました。</p>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">{searchRestaurantMutation.error.message}</p>
            </div>
          )}

          {searchRestaurantMutation.isSuccess && (
            <div>
              <h3 className="text-lg font-semibold mb-4">検索結果</h3>
              {searchRestaurantMutation.data.details && searchRestaurantMutation.data.details.length > 0 ? (
                <div className="space-y-4">
                  {searchRestaurantMutation.data.details.map((match, index) => (
                    <div key={index} className="p-4 border border-light-border dark:border-dark-border rounded-lg">
                      <h4 className="font-bold text-light-text dark:text-dark-text">{match.name}</h4>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{match.prefecture} {match.city} {match.address}</p>
                      <div className="mt-2 text-xs space-y-1">
                        <p><strong>営業時間:</strong> {match.hours || '情報なし'}</p>
                        <p><strong>料金帯:</strong> {match.priceRange || '情報なし'}</p>
                        <p><strong>Web:</strong> {match.website ? <a href={match.website} target="_blank" rel="noopener noreferrer" className="text-light-primary dark:text-dark-primary hover:underline">{match.website}</a> : '情報なし'}</p>
                      </div>
                      <div className="mt-3">
                        <button onClick={() => handleUpdateClick(match)} className="w-full px-4 py-2 text-sm font-semibold rounded-md bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors">
                          この情報で更新する
                        </button>
                      </div>
                    </div>
                  ))}
                   {searchRestaurantMutation.data.sources && searchRestaurantMutation.data.sources.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider mb-2">情報源</h4>
                        <ul className="space-y-1.5">
                          {searchRestaurantMutation.data.sources.map((source, index) => (
                            <li key={index}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-light-primary dark:text-dark-primary hover:underline transition-colors" title={source.uri}><ExternalLinkIcon className="w-4 h-4 flex-shrink-0" /><span className="truncate" style={{maxWidth: '20rem'}}>{source.title || getSafeHostname(source.uri)}</span></a></li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              ) : (
                <p className="text-center text-light-text-secondary dark:text-dark-text-secondary py-8">このお店の新しい情報は見つかりませんでした。</p>
              )}
            </div>
          )}
        </div>
        
        <footer className="flex justify-end items-center gap-3 p-4 border-t border-light-border dark:border-dark-border">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
            キャンセル
          </button>
        </footer>
      </div>
    </div>
  );
};

export default UpdateRestaurantModal;
