import React, { useState, useMemo } from 'react';
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
    if ('siteUrl' in result) { // Hotpepper result
        return favoriteRestaurants.some(r => r.sources?.some(s => s.uri === result.siteUrl) || r.customUrl === result.siteUrl);
    }
    // For Gemini, check by name and address as a fallback
    return favoriteRestaurants.some(r => r.name === result.name && r.address === result.address);
  }, [result, favoriteRestaurants]);

  const handleAnalyzeClick = async () => {
    if ('siteUrl' in result) { // Hotpepper result
      setIsAnalyzing(true);
      setAnalysisError(null);
      try {
        const response = await onAnalyzeRestaurant(result as HotpepperRestaurant);
        setAnalysis(response.comment);
      } catch (e: any) {
        setAnalysisError(e.message || '分析中にエラーが発生しました。');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const isHotpepper = 'siteUrl' in result;
  const res = result as HotpepperRestaurant | GeminiRestaurant;

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-soft border border-light-border dark:border-dark-border transition-shadow duration-300 flex flex-col p-5 gap-4">
      {/* Content */}
      <div className="flex-grow w-full">
        <div className="flex justify-between items-start">
          <div className="flex-grow">
            {/* Source Badge */}
            <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2 ${isHotpepper ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'}`}>
              {isHotpepper ? 'ホットペッパー' : 'AI Web検索'}
            </span>

            {/* Name and Catch/Genre */}
            {isHotpepper && <p className="text-sm font-semibold text-light-primary dark:text-dark-primary">{(res as HotpepperRestaurant).genre} / {(res as HotpepperRestaurant).catch}</p>}
            <h3 className="text-xl font-bold text-light-text dark:text-dark-text">{res.name}</h3>
            <p className="text-base text-light-text-secondary dark:text-dark-text-secondary mt-1">{res.address}</p>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2 bg-slate-100 dark:bg-slate-700/50 inline-block px-2 py-1 rounded-md">{res.hours || '情報なし'}</p>
          </div>
          <div className="flex-shrink-0 ml-4">
            <button
              onClick={() => onAddToFavorites(result)}
              disabled={isAlreadyFavorite || isAddingToFavorites}
              className="flex items-center justify-center gap-2 w-full bg-light-primary text-white font-semibold px-4 py-3 rounded-lg hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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

        {/* AI Analysis or Sources Section */}
        <div className="mt-4 pt-4 border-t border-light-border dark:border-dark-border space-y-3">
          {isHotpepper ? (
            <>
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
            </>
          ) : (res as GeminiRestaurant).sources && (res as GeminiRestaurant).sources.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider mb-2">情報源</h4>
              <ul className="space-y-1.5">
                {(res as GeminiRestaurant).sources.map((source, index) => (
                  <li key={index}>
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-light-primary dark:text-dark-primary hover:underline transition-colors" title={source.uri}>
                      <ExternalLinkIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate" style={{maxWidth: '20rem'}}>{source.title || getSafeHostname(source.uri)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SearchResultCard;
