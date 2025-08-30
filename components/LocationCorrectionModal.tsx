

// FIX: To resolve issues with missing Google Maps type definitions in the build environment,
// the `google` global is declared as `any`. This bypasses compile-time errors
// and relies on the Google Maps script being loaded at runtime.
declare var google: any;

import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Restaurant } from '../types';
import XIcon from './icons/XIcon';
import SearchIcon from './icons/SearchIcon';
import SmallLoadingSpinner from './icons/SmallLoadingSpinner';

interface LocationCorrectionModalProps {
  restaurant: Restaurant;
  onClose: () => void;
  onSave: (restaurantId: string, newCoords: { lat: number; lng: number }) => Promise<void>;
  apiKey: string;
}

const LocationCorrectionModal: React.FC<LocationCorrectionModalProps> = ({ restaurant, onClose, onSave, apiKey }) => {
  const isInvalidCoords = restaurant.latitude == null || restaurant.longitude == null || (restaurant.latitude === 0 && restaurant.longitude === 0);
  
  const initialPosition = {
    lat: isInvalidCoords ? 35.6895 : restaurant.latitude, // Default to Tokyo if invalid
    lng: isInvalidCoords ? 139.6917 : restaurant.longitude
  };
  
  const [position, setPosition] = useState(initialPosition);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleDragEnd = (e: any) => {
    if (e.latLng) {
      setPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      // FIX: Replaced `window.google` with `google` to resolve TypeScript errors, relying on the globally declared `google` variable.
      if (!google || !google.maps || !google.maps.Geocoder) {
          throw new Error("Google Maps APIが読み込まれていません。ページを再読み込みしてお試しください。");
      }
      // FIX: Replaced `window.google` with `google` to resolve TypeScript errors, relying on the globally declared `google` variable.
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ address: searchQuery });
      
      if (response.results && response.results.length > 0) {
        const location = response.results[0].geometry.location;
        const newCoords = { lat: location.lat(), lng: location.lng() };
        setPosition(newCoords);
      } else {
        // This case is typically handled by the catch block with error code 'ZERO_RESULTS'
        throw { code: 'ZERO_RESULTS' };
      }
    } catch (error: any) {
      console.error("Client-side geocoding failed:", error);
      let errorMessage = 'ジオコーディング中に不明なエラーが発生しました。';
      if (error.code === 'ZERO_RESULTS') {
          errorMessage = '指定された住所が見つかりませんでした。入力内容を確認してください。';
      } else if (error.code) {
          errorMessage = `座標を取得できませんでした。エラー: ${error.code}`;
      } else if (error.message) {
          errorMessage = error.message;
      }
      setSearchError(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(restaurant.id, position);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-light-card dark:bg-dark-card rounded-ui-medium shadow-soft-lg w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">位置情報を修正</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <XIcon className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
          </button>
        </header>
        
        <div className="p-6 flex-grow overflow-y-auto">
            <p className="mb-4 text-light-text-secondary dark:text-dark-text-secondary">
                住所で検索するか、地図上のマーカーをドラッグして、<strong className="text-light-text dark:text-dark-text">{restaurant.name}</strong> の正しい位置に移動してください。
            </p>

            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="住所で検索..."
                className="flex-grow px-3 py-2 text-base bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary transition duration-200"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="flex-shrink-0 w-12 flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-md bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? <SmallLoadingSpinner /> : <SearchIcon className="w-5 h-5" />}
              </button>
            </form>
            {searchError && <p className="text-sm text-red-600 dark:text-red-400 mb-4 -mt-2">{searchError}</p>}

            <div className="h-80 w-full rounded-lg overflow-hidden border border-light-border dark:border-dark-border">
                <APIProvider apiKey={apiKey}>
                    <Map
                        center={position}
                        zoom={16}
                        mapId={`location-correction-${restaurant.id}`}
                        gestureHandling={'greedy'}
                        disableDefaultUI={true}
                        className="w-full h-full"
                    >
                        <AdvancedMarker
                            position={position}
                            draggable={true}
                            onDragEnd={handleDragEnd}
                        />
                    </Map>
                </APIProvider>
            </div>
            <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-md text-sm">
                <p className="text-light-text dark:text-dark-text font-mono">
                    <span className="font-semibold">緯度:</span> {position.lat.toFixed(6)}, <span className="font-semibold">経度:</span> {position.lng.toFixed(6)}
                </p>
            </div>
        </div>
        
        <footer className="flex justify-end items-center gap-3 p-4 border-t border-light-border dark:border-dark-border flex-shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-md text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
          >
            キャンセル
          </button>
          <button 
            type="button" 
            onClick={handleSave} 
            disabled={isSaving}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : 'この位置に保存'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default LocationCorrectionModal;