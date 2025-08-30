
import React, { useState, useRef, useEffect } from 'react';
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
import RefreshCwIcon from './icons/RefreshCwIcon';
import SmallLoadingSpinner from './icons/SmallLoadingSpinner';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import MoveIcon from './icons/MoveIcon';


interface RestaurantCardProps {
  restaurant: Restaurant;
  onDelete: (id: string, name: string) => void;
  onUpdate: (id: string, updatedData: Partial<Pick<Restaurant, 'visitCount' | 'userComment' | 'customUrl' | 'genres' | 'latitude' | 'longitude' | 'priceRange' | 'isClosed'>>) => void;
  onFixLocation: (restaurant: Restaurant) => void;
  isGeocoding: boolean;
  onOpenLocationEditor: (restaurant: Restaurant) => void;
  isReadOnly: boolean;
  onRefetch: (restaurant: Restaurant) => void;
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  children: React.ReactNode;
}

const IconButton: React.FC<IconButtonProps> = ({ href, children, className, ...props }) => {
  const classes = twMerge("p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-light-primary focus:ring-offset-2 dark:focus:ring-offset-dark-card", className);
  
  if (href && !props.disabled) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...(props as unknown as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
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


const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onDelete, onUpdate, onFixLocation, isGeocoding, onOpenLocationEditor, isReadOnly, onRefetch }) => {
  const controlsDisabled = isReadOnly || !!restaurant.isClosed;
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


  useEffect(() => {
    if (isEditingPrice && priceInputRef.current) priceInputRef.current.focus();
  }, [isEditingPrice]);

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
    <div id={`restaurant-${restaurant.id}`} className={twMerge("bg-light-card dark:bg-dark-card p-5 rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border transition-all duration-300 flex flex-col gap-4 hover:shadow-soft-lg hover:-translate-y-1 relative", restaurant.isClosed && "opacity-60 bg-slate-50 dark:bg-slate-800")}>
      {restaurant.isClosed && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-ui-medium z-10 pointer-events-none">
          <span className="text-white text-2xl font-bold border-4 border-white rounded-lg px-4 py-2 -rotate-12 select-none">閉業</span>
        </div>
      )}
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">{restaurant.name}</h3>
          <p className="text-sm font-medium text-light-primary dark:text-dark-primary">{restaurant.city}</p>
          <p className="text-base text-light-text-secondary dark:text-dark-text-secondary mt-1">{restaurant.address}</p>
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap mt-2">
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary bg-slate-100 dark:bg-slate-700/50 inline-block px-2 py-1 rounded-md">{restaurant.hours || '営業時間未登録'}</p>
            {restaurant.priceRange && <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary bg-slate-100 dark:bg-slate-700/50 inline-block px-2 py-1 rounded-md">{restaurant.priceRange}</p>}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-light-text dark:text-dark-text">来店回数:</span>
            <div className="flex items-center gap-2">
                {!controlsDisabled && <button onClick={() => handleVisitCountChange(-1)} className="p-1.5 rounded-full bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-50" disabled={(restaurant.visitCount || 0) <= 0}><MinusIcon /></button>}
                <span className="text-lg font-bold w-8 text-center text-light-text dark:text-dark-text">{restaurant.visitCount || 0}</span>
                {!controlsDisabled && <button onClick={() => handleVisitCountChange(1)} className="p-1.5 rounded-full bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"><PlusIcon /></button>}
            </div>
        </div>

        <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-1 text-sm font-semibold text-light-primary dark:text-dark-primary hover:opacity-80 transition-opacity" aria-expanded={isExpanded}>
            <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            <span>詳細</span>
        </button>
      </div>
        <div className="flex items-center ml-2">
            <div className="flex gap-1 overflow-x-auto whitespace-nowrap">
                {restaurant.customUrl && (<IconButton href={restaurant.customUrl.startsWith('http') ? restaurant.customUrl : `https://${restaurant.customUrl}`} title="ウェブサイト" disabled={restaurant.isClosed || isReadOnly}><ExternalLinkIcon className="w-5 h-5"/></IconButton>)}
                <IconButton href={mapUrl} title={hasInvalidCoords ? "位置情報がありません" : "地図で見る"} disabled={hasInvalidCoords || restaurant.isClosed || isReadOnly}><MapPinIcon /></IconButton>
                {!controlsDisabled && (
                  <IconButton onClick={() => onRefetch(restaurant)} aria-label="情報を更新" title="情報を更新">
                    <RefreshCwIcon className="w-5 h-5"/>
                  </IconButton>
                )}
                {!isReadOnly && (<IconButton onClick={() => onDelete(restaurant.id, restaurant.name)} aria-label={`${restaurant.name}を削除`} title="削除" className="hover:bg-red-500/10 text-red-500"><TrashIcon /></IconButton>)}
            </div>
        </div>

      <div className={`transition-all duration-500 ease-in-out grid ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="bg-slate-50/70 dark:bg-slate-800/50 p-4 rounded-lg space-y-4 mt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-light-text dark:text-dark-text">料金帯:</span>
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

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-light-text dark:text-dark-text">コメント:</span>
                    {!isEditingComment && !controlsDisabled && (<IconButton onClick={() => setIsEditingComment(true)} className="w-8 h-8"><PencilIcon /></IconButton>)}
                </div>
                {isEditingComment && !controlsDisabled ? (
                    <textarea ref={textareaRef} value={comment} onChange={handleCommentChange} onBlur={handleCommentBlur} onKeyDown={handleCommentKeyDown} className="w-full p-2 text-sm bg-light-bg dark:bg-dark-bg border border-light-primary dark:border-dark-primary rounded-md focus:ring-2 focus:ring-light-primary transition resize-none overflow-hidden" placeholder="お店の思い出や好きなメニューなどを記録..." rows={1} />
                ) : (
                    <p onClick={() => !controlsDisabled && setIsEditingComment(true)} className={`w-full p-2 text-sm min-h-[40px] rounded-md ${!controlsDisabled ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700' : ''} transition whitespace-pre-wrap text-light-text-secondary dark:text-dark-text-secondary`}>
                        {restaurant.userComment || (controlsDisabled ? 'コメントはありません。' : <span className="text-slate-400 dark:text-slate-500">コメントを追加...</span>)}
                    </p>
                )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-light-text dark:text-dark-text"><LinkIcon />ウェブサイトURL:</span>
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
                    <span className="flex items-center gap-2 text-sm font-medium text-light-text dark:text-dark-text"><TagIcon />ジャンル:</span>
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
                    <span className="flex items-center gap-2 text-sm font-medium text-light-text dark:text-dark-text"><MapPinIcon className="w-4 h-4" />位置情報:</span>
                    {!hasInvalidCoords && !controlsDisabled && (<IconButton onClick={() => onOpenLocationEditor(restaurant)} title="位置を調整" className="w-8 h-8"><MoveIcon /></IconButton>)}
                </div>
                {hasInvalidCoords ? (
                    <div className="flex items-center justify-between gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-md">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">地図に表示するための位置情報がありません。</p>
                        {!controlsDisabled && <button onClick={() => onFixLocation(restaurant)} disabled={isGeocoding} className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-yellow-200 dark:bg-yellow-400/30 text-yellow-900 dark:text-yellow-200 hover:bg-yellow-300 dark:hover:bg-yellow-400/40 transition disabled:opacity-50 disabled:cursor-wait">
                            {isGeocoding ? (<><SmallLoadingSpinner /><span>取得中...</span></>) : (<><RefreshCwIcon /><span>再取得</span></>)}
                        </button>}
                    </div>
                ) : (
                    <p className="p-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">緯度: {restaurant.latitude.toFixed(4)}, 経度: {restaurant.longitude.toFixed(4)}</p>
                )}
            </div>

            {Array.isArray(restaurant.sources) && restaurant.sources.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider mb-2">情報源</h4>
                <ul className="space-y-1.5">
                  {restaurant.sources.map((source, index) => (
                    <li key={index}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-light-primary dark:text-dark-primary hover:underline transition-colors" title={source.uri}><ExternalLinkIcon className="w-4 h-4 flex-shrink-0" /><span className="truncate" style={{maxWidth: '20rem'}}>{source.title || getSafeHostname(source.uri)}</span></a></li>
                  ))}
                </ul>
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2 italic">AIによるWeb検索で見つかった情報源です。</p>
              </div>
            )}

            {!isReadOnly && (
              <div className="pt-4 mt-4 border-t border-light-border dark:border-dark-border flex flex-col gap-2">
                {restaurant.isClosed ? (
                  <button
                    onClick={() => onUpdate(restaurant.id, { isClosed: false })}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    <CheckIcon className="w-5 h-5" />
                    閉業解除
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
