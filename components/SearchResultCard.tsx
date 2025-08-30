

import React, { useState, useMemo } from 'react';
// FIX: Add GeminiRestaurant to imports for more specific typing
import type { SearchResult, HotpepperRestaurant, GeminiRestaurant, Restaurant } from '../types';
import ExternalLinkIcon from './icons/ExternalLinkIcon';
import StarIcon from './icons/StarIcon';
import SmallLoadingSpinner from './icons/SmallLoadingSpinner';
import SparklesIcon from './icons/SparklesIcon';
import CheckIcon from './icons/CheckIcon';


interface SearchResultCardProps {
  result: SearchResult;
  onAddToFavorites: (result: SearchResult) => void;
  onAnalyzeRestaurant: (restaurant: HotpepperRestaurant) => Promise<{ comment: string }>;
  favoriteRestaurants: Restaurant[];
  isAddingToFavorites: boolean;
}

const getSafeHostname = (uri: string | undefined | null): string => {
  if (!uri) return '不明なソース';
  try {
    const fullUrl = uri.startsWith('http') ? uri : `https://${uri}`;
    return new URL(fullUrl).hostname;
  } catch (e) {
    return uri;
  }
};

const SearchResultCard: React.FC<SearchResultCardProps> = ({ result, onAddToFavorites, onAnalyzeRestaurant, favoriteRestaurants, isAddingToFavorites }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const isAlreadyFavorite = useMemo(() => {
    if (!favoriteRestaurants) return false;
    if (result.isFromHotpepper) {
        return favoriteRestaurants.some(r => r.sources?.some(s => s.uri === result.siteUrl) || r.customUrl === result.siteUrl);
    }
    // For Gemini, check by name and address as a fallback
    return favoriteRestaurants.some(r => r.name === result.name && r.address === result.address);
  }, [result, favoriteRestaurants]);


  const handleAnalyzeClick = async () => {
    if (result.isFromHotpepper) {
      setIsAnalyzing(true);
      setAnalysisError(null);
      try {
        const response = await onAnalyzeRestaurant(result);
        setAnalysis(response.comment);
      } catch (e: any) {
        setAnalysisError(e.message || '分析中にエラーが発生しました。');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };


  const renderHotpepperResult = (res: HotpepperRestaurant) => (
    <>
      <div className="flex-shrink-0 w-full sm:w-48">
        <img src={res.photoUrl} alt={res.name} className="w-full h-40 object-cover rounded-lg" />
      </div>
      <div className="flex-grow w-full">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full dark:bg-red-900 dark:text-red-300">ホットペッパー</span>
        </div>
        <p className="text-sm font-semibold text-light-primary dark:text-dark-primary">{res.genre} / {res.catch}</p>
        <h3 className="text-xl font-bold text-light-text dark:text-dark-text">{res.name}</h3>
        <p className="text-base text-light-text-secondary dark:text-dark-text-secondary mt-1">{res.address}</p>
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2 bg-slate-100 dark:bg-slate-700/50 inline-block px-2 py-1 rounded-md">{res.hours || '情報なし'}</p>
        <div className="mt-4 space-y-2">
            {!analysis && (
              <button 
                onClick={handleAnalyzeClick} 
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                  {isAnalyzing ? <><SmallLoadingSpinner /><span>分析中...</span></> : <><SparklesIcon /><span>AIにこのお店について聞く</span></>}
              </button>
            )}
            {analysisError && <p className="text-sm text-red-500 dark:text-red-400">{analysisError}</p>}
            {analysis && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-light-text dark:text-dark-text whitespace-pre-wrap">{analysis}</p>
                </div>
            )}
        </div>
      </div>
    </>
  );

  // FIX: Changed parameter type to the more specific GeminiRestaurant to fix type inference issues.
  const renderGeminiResult = (res: GeminiRestaurant) => (
    <div className="flex-grow w-full">
       <div className="flex items-center gap-2 mb-1">
          <span className="inline-block bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full dark:bg-indigo-900 dark:text-indigo-300">AI Web検索</span>
       </div>
      <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">{res.name}</h3>
      <p className="text-sm font-medium text-light-primary dark:text-dark-primary">{res.city}</p>
      <p className="text-base text-light-text-secondary dark:text-dark-text-secondary mt-1">{res.address}</p>
      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2 bg-slate-100 dark:bg-slate-700/50 inline-block px-2 py-1 rounded-md">{res.hours || '情報なし'}</p>
      <div className="mt-4 pt-3 border-t border-light-border dark:border-dark-border">
        <h4 className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider mb-2">情報源</h4>
        {/* FIX: Simplified conditional check. `res.sources` is sufficient now with the correct type. */}
        {res.sources && res.sources.length > 0 ? (
          <>
            <ul className="space-y-1.5">
              {res.sources.map((source, index) => (
                <li key={index}>
                  <a href={source.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-light-primary dark:text-dark-primary hover:underline transition-colors" title={source.uri}>
                    <ExternalLinkIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate" style={{maxWidth: '20rem'}}>{source.title || getSafeHostname(source.uri)}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2 italic">この情報は、AIがWeb検索結果と自身の知識を統合して生成しました。</p>
          </>
        ) : (
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">AIの知識から生成された情報です。</p>
        )}
      </div>
    </div>
  );

  // FIX: Resolved a type-narrowing issue by using an if/else block to determine the card content.
  // This is more robust for the TypeScript compiler than a ternary operator inside JSX.
  let cardContent;
  // FIX: Using the 'in' operator for a more robust type guard. The original check
  // on the 'isFromHotpepper' property was failing to narrow the type correctly.
  if ('siteUrl' in result) {
    cardContent = renderHotpepperResult(result);
  } else {
    cardContent = renderGeminiResult(result);
  }

  return (
    <div className="bg-light-card dark:bg-dark-card p-5 rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border transition-shadow duration-300 flex flex-col sm:flex-row items-start gap-4">
      {cardContent}
      <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-auto self-start sm:self-center">
        <button
          onClick={() => onAddToFavorites(result)}
          disabled={isAlreadyFavorite || isAddingToFavorites}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 w-full bg-light-primary text-white font-semibold px-4 py-2 rounded-lg hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isAlreadyFavorite ? (
            <>
              <CheckIcon />
              <span>追加済み</span>
            </>
          ) : (
            <>
              <StarIcon />
              <span>お気に入りに追加</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SearchResultCard;