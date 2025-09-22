import React, { useState, useRef, useEffect, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import type { Restaurant } from '../types';
import MapPinIcon from './icons/MapPinIcon';
import TrashIcon from './icons/TrashIcon';
import ExternalLinkIcon from './icons/ExternalLinkIcon';
import PlusIcon from './icons/PlusIcon';
import MinusIcon from './icons/MinusIcon';
import PencilIcon from './icons/PencilIcon';
import LinkIcon from './icons/LinkIcon';
import TagIcon from './icons/TagIcon';
import XIcon from './icons/XIcon';
import CheckIcon from './icons/CheckIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ClockIcon from './icons/ClockIcon';
import RefreshCwIcon from './icons/RefreshCwIcon';
import SmallLoadingSpinner from './icons/SmallLoadingSpinner';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import MoveIcon from './icons/MoveIcon';

interface RestaurantCardProps {
  restaurant: Restaurant;
  myRestaurants?: Restaurant[];
  onAddToFavorites?: (restaurant: Restaurant) => void;
  onDelete: (id: string, name: string) => void;
  onUpdate: (id: string, updatedData: Partial<Pick<Restaurant, 'visitCount' | 'userComment' | 'customUrl' | 'genres' | 'latitude' | 'longitude' | 'priceRange' | 'isClosed'>>) => void;
  onFixLocation: (restaurant: Restaurant) => void;
  isGeocoding: boolean;
  onOpenLocationEditor: (restaurant: Restaurant) => void;
  isReadOnly: boolean;
  onAnalyze: (restaurant: Restaurant) => void;
  isAnalyzing: boolean;
}

const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className, ...props }) => {
  const classes = twMerge(
    "p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-light-primary focus:ring-offset-2 dark:focus:ring-offset-dark-card",
    className
  );
  return <button className={classes} {...props}>{children}</button>;
};

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  myRestaurants,
  onAddToFavorites,
  onDelete,
  onUpdate,
  onFixLocation,
  isGeocoding,
  onOpenLocationEditor,
  isReadOnly,
  onAnalyze,
  isAnalyzing,
}) => {
  const controlsDisabled = isReadOnly || !!restaurant.isClosed || isAnalyzing;
  const hasInvalidCoords = restaurant.latitude == null || restaurant.longitude == null || (restaurant.latitude === 0 && restaurant.longitude === 0);
  const mapUrl = hasInvalidCoords ? '#' : `https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [comment, setComment] = useState(restaurant.userComment);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [customUrl, setCustomUrl] = useState(restaurant.customUrl || '');
  const urlInputRef = useRef<HTMLInputElement>(null);

  const [isAddingGenre, setIsAddingGenre] = useState(false);
  const [newGenre, setNewGenre] = useState('');
  const genreInputRef = useRef<HTMLInputElement>(null);

  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceRange, setPriceRange] = useState(restaurant.priceRange || '');
  const priceInputRef = useRef<HTMLInputElement>(null);

  const [isEditingHours, setIsEditingHours] = useState(false);
  const [hours, setHours] = useState(restaurant.hours || '');
  const hoursTextareaRef = useRef<HTMLTextAreaElement>(null);

  const isAlreadyInFavorites = useMemo(() => {
    if (!myRestaurants) return false;
    return myRestaurants.some(r => r.name === restaurant.name && r.address === restaurant.address);
  }, [myRestaurants, restaurant]);

  useEffect(() => {
    if (isEditingPrice && priceInputRef.current) priceInputRef.current.focus();
  }, [isEditingPrice]);

  useEffect(() => {
    if (isEditingHours && hoursTextareaRef.current) {
      hoursTextareaRef.current.focus();
      hoursTextareaRef.current.style.height = 'auto';
      hoursTextareaRef.current.style.height = `${hoursTextareaRef.current.scrollHeight}px`;
    }
  }, [isEditingHours]);

  useEffect(() => {
    if (isEditingComment && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditingComment]);

  useEffect(() => {
    if (isEditingUrl && urlInputRef.current) urlInputRef.current.focus();
  }, [isEditingUrl]);

  useEffect(() => {
    if (isAddingGenre && genreInputRef.current) genreInputRef.current.focus();
  }, [isAddingGenre]);

  const handleVisitCountChange = (change: number) => {
    const currentCount = Number(restaurant.visitCount) || 0;
    const newCount = Math.max(0, currentCount + change);
    onUpdate(restaurant.id, { visitCount: newCount });
  };

  const handleCommentBlur = () => {
    setIsEditingComment(false);
    if (comment !== restaurant.userComment) {
      onUpdate(restaurant.id, { userComment: comment });
    }
  };
  
  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommentBlur(); }
  }

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleHoursBlur = () => {
    setIsEditingHours(false);
    if (hours !== restaurant.hours) {
      onUpdate(restaurant.id, { hours: hours });
    }
  };

  const handleHoursKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleHoursBlur(); }
  }

  const handleHoursChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHours(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleUrlBlur = () => {
    setIsEditingUrl(false);
    const trimmedUrl = customUrl.trim();
    if (trimmedUrl !== (restaurant.customUrl || '')) {
      onUpdate(restaurant.id, { customUrl: trimmedUrl });
    }
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleUrlBlur(); }
  };

  const handleRemoveGenre = (genreToRemove: string) => {
    const updatedGenres = (restaurant.genres || []).filter(g => g !== genreToRemove);
    onUpdate(restaurant.id, { genres: updatedGenres });
  };

  const handleGenreFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedGenre = newGenre.trim();
    if (trimmedGenre && !(restaurant.genres || []).includes(trimmedGenre)) {
      const updatedGenres = [...(restaurant.genres || []), trimmedGenre].sort((a,b) => a.localeCompare(b, 'ja'));
      onUpdate(restaurant.id, { genres: updatedGenres });
    }
    setNewGenre('');
    setIsAddingGenre(false);
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

  const handlePriceBlur = () => {
    setIsEditingPrice(false);
    const formattedPrice = formatPriceInput(priceRange);
    setPriceRange(formattedPrice);
    if (formattedPrice !== (restaurant.priceRange || '')) {
      onUpdate(restaurant.id, { priceRange: formattedPrice });
    }
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handlePriceBlur(); }
  };

  return (
    <div
      id={`restaurant-${restaurant.id}`}
      className={twMerge(
        "bg-light-card dark:bg-dark-card rounded-xl shadow-soft border border-light-border dark:border-dark-border transition-all duration-300 relative overflow-hidden",
        !isExpanded && "hover:shadow-soft-lg hover:-translate-y-1",
        (restaurant.isClosed || isAnalyzing) && "opacity-60 bg-slate-50 dark:bg-slate-800"
      )}
    >
      {isAnalyzing && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 pointer-events-none">
            <SmallLoadingSpinner />
            <span className='ml-2 text-white'>AIが分析中...</span>
        </div>
      )}
      {restaurant.isClosed && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-white text-2xl font-bold border-4 border-white rounded-lg px-4 py-2 -rotate-12 select-none">閉業</span>
        </div>
      )}

      <div className="flex flex-col p-5">
        <div className="flex-grow">
          <div className="flex justify-between items-start">
              <div className="flex-grow">
                  {restaurant.genres && restaurant.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                      {restaurant.genres.map(genre => (
                      <span key={genre} className="text-xs font-semibold px-2.5 py-1 bg-sky-100 dark:bg-sky-900/70 text-sky-800 dark:text-sky-200 rounded-full">
                          {genre}
                      </span>
                      ))}
                  </div>
                  )}
                  <h3 className="text-xl font-bold text-light-text dark:text-dark-text">{restaurant.name}</h3>
              </div>
              {onAddToFavorites && (
                  <div className="ml-4 flex-shrink-0">
                      {isAlreadyInFavorites ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                          <CheckIcon className="w-4 h-4" />
                          追加済み
                      </span>
                      ) : (
                      <button
                          onClick={() => onAddToFavorites(restaurant)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors"
                      >
                          <PlusIcon className="w-4 h-4" />
                          お気に入りに追加
                      </button>
                      )}
                  </div>
              )}
          </div>

          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1 flex items-start gap-1.5">
            <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{restaurant.prefecture}{restaurant.city}{restaurant.address}</span>
          </p>

          {restaurant.hours && (
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2 flex items-start gap-1.5">
              <ClockIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{restaurant.hours}</span>
            </p>
          )}

          {restaurant.priceRange && <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mt-2">{restaurant.priceRange}</p>}

          {restaurant.userComment && !isExpanded && (
            <p className="text-sm text-light-text dark:text-dark-text mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md whitespace-pre-wrap truncate">
              {restaurant.userComment}
            </p>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-light-text dark:text-dark-text">来店回数:</span>
              <div className="flex items-center gap-1">
                {!controlsDisabled && <IconButton onClick={() => handleVisitCountChange(-1)} className="w-8 h-8 disabled:opacity-50" disabled={(restaurant.visitCount || 0) <= 0}><MinusIcon className="w-4 h-4"/></IconButton>}
                <span className="text-lg font-bold w-8 text-center text-light-text dark:text-dark-text">{restaurant.visitCount || 0}</span>
                {!controlsDisabled && <IconButton onClick={() => handleVisitCountChange(1)} className="w-8 h-8"><PlusIcon className="w-4 h-4"/></IconButton>}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {restaurant.siteUrl && (
                  <a href={restaurant.siteUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="公式サイト">
                      <ExternalLinkIcon className="w-5 h-5"/>
                  </a>
              )}
              {restaurant.customUrl && (
                  <a href={restaurant.customUrl.startsWith('http') ? restaurant.customUrl : `https://${restaurant.customUrl}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="カスタムリンク">
                  <LinkIcon className="w-5 h-5"/>
                  </a>
              )}
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={twMerge("p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors", (hasInvalidCoords || restaurant.isClosed) && "opacity-50 cursor-not-allowed")} title="Googleマップで開く">
                  <MapPinIcon className="w-5 h-5" />
              </a>
              {!controlsDisabled && (
                  <IconButton onClick={() => onAnalyze(restaurant)} aria-label="AIでコメント更新" title="AIでコメント更新" disabled={isAnalyzing}>
                  <RefreshCwIcon className="w-5 h-5"/>
                  </IconButton>
              )}
              {!isReadOnly && (
                  <IconButton onClick={() => onDelete(restaurant.id, restaurant.name)} aria-label="削除" title="削除" className="hover:text-red-500 dark:hover:text-red-400" disabled={isAnalyzing}>
                  <TrashIcon className="w-5 h-5"/>
                  </IconButton>
              )}
              <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-1 text-sm font-semibold text-light-primary dark:text-dark-primary hover:opacity-80 transition-opacity p-2 rounded-full" aria-expanded={isExpanded}>
                  <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`transition-all duration-500 ease-in-out grid ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="bg-slate-50/70 dark:bg-slate-800/50 p-5 space-y-4 border-t border-light-border dark:border-dark-border">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-light-text dark:text-dark-text">コメント:</h4>
                {!isEditingComment && !controlsDisabled && (<IconButton onClick={() => setIsEditingComment(true)} className="w-8 h-8"><PencilIcon /></IconButton>)}
              </div>
              {isEditingComment && !controlsDisabled ? (
                  <textarea ref={textareaRef} value={comment} onChange={handleCommentChange} onBlur={handleCommentBlur} onKeyDown={handleCommentKeyDown} className="w-full p-2 text-sm bg-light-bg dark:bg-dark-bg border border-light-primary dark:border-dark-primary rounded-md focus:ring-2 focus:ring-light-primary transition resize-none overflow-hidden" placeholder="お店の思い出や好きなメニューなどを記録..." rows={1} />
              ) : (
                  <p onClick={() => !controlsDisabled && setIsEditingComment(true)} className={`w-full p-2 text-sm min-h-[40px] rounded-md ${!controlsDisabled ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700' : ''} transition whitespace-pre-wrap text-light-text-secondary dark:text-dark-text-secondary`}>
                      {restaurant.userComment || (controlsDisabled ? 'コメントはありません。': <span className="text-slate-400 dark:text-slate-500">コメントを追加...</span>)}
                  </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-medium text-light-text dark:text-dark-text"><ClockIcon />営業時間:</h4>
                {!isEditingHours && !controlsDisabled && (<IconButton onClick={() => setIsEditingHours(true)} className="w-8 h-8"><PencilIcon /></IconButton>)}
              </div>
              {isEditingHours && !controlsDisabled ? (
                  <textarea ref={hoursTextareaRef} value={hours} onChange={handleHoursChange} onBlur={handleHoursBlur} onKeyDown={handleHoursKeyDown} className="w-full p-2 text-sm bg-light-bg dark:bg-dark-bg border border-light-primary dark:border-dark-primary rounded-md focus:ring-2 focus:ring-light-primary transition resize-none overflow-hidden" placeholder="営業時間や定休日などを記録..." rows={1} />
              ) : (
                  <p onClick={() => !controlsDisabled && setIsEditingHours(true)} className={`w-full p-2 text-sm min-h-[40px] rounded-md ${!controlsDisabled ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700' : ''} transition whitespace-pre-wrap text-light-text-secondary dark:text-dark-text-secondary`}>
                      {restaurant.hours || (controlsDisabled ? '営業時間は未登録です。': <span className="text-slate-400 dark:text-slate-500">時間を追加...</span>)}
                  </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="flex items-center gap-2 text-sm font-medium text-light-text dark:text-dark-text"><TagIcon />ジャンル:</h4>
                        {!isAddingGenre && !controlsDisabled && (<IconButton onClick={() => setIsAddingGenre(true)} className="w-8 h-8"><PlusIcon /></IconButton>)}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center min-h-[30px]">
                        {(restaurant.genres || []).map(genre => (
                            <span key={genre} className="flex items-center gap-1.5 bg-sky-100 dark:bg-sky-900/70 text-sky-800 dark:text-sky-200 text-xs font-semibold px-2 py-1 rounded-full">
                                {genre}
                                {!controlsDisabled && <button onClick={() => handleRemoveGenre(genre)} className="text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-200"><XIcon className="w-3 h-3"/></button>}
                            </span>
                        ))}
                        {isAddingGenre && !controlsDisabled && (
                            <form onSubmit={handleGenreFormSubmit} className="flex-grow">
                                <input ref={genreInputRef} type="text" value={newGenre} onChange={(e) => setNewGenre(e.target.value)} onBlur={handleGenreFormSubmit} className="w-full p-1 text-sm bg-light-bg dark:bg-dark-bg border border-light-primary dark:border-dark-primary rounded-md focus:ring-2 focus:ring-light-primary transition" placeholder="ジャンルを入力..." />
                            </form>
                        )}
                        {(restaurant.genres?.length || 0) === 0 && !isAddingGenre && (
                            <p className="text-sm text-slate-400 dark:text-slate-500">{controlsDisabled ? 'ジャンルはありません。' : 'ジャンルを追加...'}</p>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="flex items-center gap-2 text-sm font-medium text-light-text dark:text-dark-text">料金帯:</h4>
                        {!isEditingPrice && !controlsDisabled && (<IconButton onClick={() => setIsEditingPrice(true)} className="w-8 h-8"><PencilIcon /></IconButton>)}
                    </div>
                    {isEditingPrice && !controlsDisabled ? (
                        <input ref={priceInputRef} type="text" value={priceRange} onChange={(e) => setPriceRange(e.target.value)} onBlur={handlePriceBlur} onKeyDown={handlePriceKeyDown} className="w-full p-2 text-sm bg-light-bg dark:bg-dark-bg border border-light-primary dark:border-dark-primary rounded-md focus:ring-2 focus:ring-light-primary transition" placeholder="例: 1000,2000" />
                    ) : (
                        <p onClick={() => !controlsDisabled && setIsEditingPrice(true)} className={`w-full p-2 text-sm min-h-[40px] rounded-md ${!controlsDisabled ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700' : ''} transition-colors truncate text-light-text-secondary dark:text-dark-text-secondary`}>
                        {restaurant.priceRange || (controlsDisabled ? '料金帯は未登録です。' : <span className="text-slate-400 dark:text-slate-500">料金帯を追加...</span>)}
                        </p>
                    )}
                </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-medium text-light-text dark:text-dark-text"><LinkIcon />ウェブサイトURL:</h4>
                {!isEditingUrl && !controlsDisabled && (<IconButton onClick={() => setIsEditingUrl(true)} className="w-8 h-8"><PencilIcon /></IconButton>)}
              </div>
              {isEditingUrl && !controlsDisabled ? (
                <input ref={urlInputRef} type="text" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} onBlur={handleUrlBlur} onKeyDown={handleUrlKeyDown} className="w-full p-2 text-sm bg-light-bg dark:bg-dark-bg border border-light-primary dark:border-dark-primary rounded-md focus:ring-2 focus:ring-light-primary transition" placeholder="https://example.com" />
              ) : (
                <p onClick={() => !controlsDisabled && setIsEditingUrl(true)} className={`w-full p-2 text-sm min-h-[40px] rounded-md ${!controlsDisabled ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700' : ''} transition-colors truncate text-light-text-secondary dark:text-dark-text-secondary`}>
                  {restaurant.customUrl || (controlsDisabled ? 'URLはありません。' : <span className="text-slate-400 dark:text-slate-500">URLを追加...</span>)}
                </p>
              )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-light-text dark:text-dark-text"><MapPinIcon className="w-4 h-4" />位置情報:</h4>
                    <div className="flex items-center">
                        {!hasInvalidCoords && !controlsDisabled && (<IconButton onClick={() => onOpenLocationEditor(restaurant)} title="位置を調整" className="w-8 h-8"><MoveIcon /></IconButton>)}
                        {!controlsDisabled && <IconButton onClick={() => onFixLocation(restaurant)} disabled={isGeocoding} className="w-8 h-8"><RefreshCwIcon className={isGeocoding ? 'animate-spin' : ''} /></IconButton>}
                    </div>
                </div>
                <p className="p-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">緯度: {restaurant.latitude?.toFixed(4) || '未設定'}, 経度: {restaurant.longitude?.toFixed(4) || '未設定'}</p>
            </div>

            {!isReadOnly && (
              <div className="pt-4 mt-4 border-t border-light-border dark:border-dark-border flex flex-col gap-2">
                {restaurant.isClosed ? (
                  <button
                    onClick={() => onUpdate(restaurant.id, { isClosed: false })}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    <CheckIcon className="w-5 h-5" />
                    営業中に戻す
                  </button>
                ) : (
                  <button
                    onClick={() => onUpdate(restaurant.id, { isClosed: true })}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <AlertTriangleIcon className="w-5 h-5" />
                    このお店を閉業としてマーク
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
