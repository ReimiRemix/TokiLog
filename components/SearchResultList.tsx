

import React from 'react';
import type { SearchResult, HotpepperRestaurant, Restaurant } from '../types';
import SearchResultCard from './SearchResultCard';

interface SearchResultListProps {
  results: SearchResult[];
  onAddToFavorites: (result: SearchResult) => void;
  onAnalyzeRestaurant: (restaurant: HotpepperRestaurant) => Promise<{ comment: string }>;
  favoriteRestaurants: Restaurant[];
  isAddingToFavorites: boolean;
}

const SearchResultList: React.FC<SearchResultListProps> = ({ results, onAddToFavorites, onAnalyzeRestaurant, favoriteRestaurants, isAddingToFavorites }) => {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text border-b-2 border-light-primary/30 dark:border-dark-primary/30 pb-2">検索結果</h2>
        <div className="space-y-4">
            {results.map((result, index) => (
                <SearchResultCard
                    key={'isFromHotpepper' in result && result.isFromHotpepper ? result.id : index}
                    result={result}
                    onAddToFavorites={onAddToFavorites}
                    onAnalyzeRestaurant={onAnalyzeRestaurant}
                    favoriteRestaurants={favoriteRestaurants}
                    isAddingToFavorites={isAddingToFavorites}
                />
            ))}
        </div>
    </div>
  );
};

export default SearchResultList;
