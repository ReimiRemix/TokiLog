import React from 'react';
import type { Restaurant } from '../types';
import RestaurantCard from './RestaurantCard';

interface RestaurantListProps {
  restaurants: Restaurant[];
  myRestaurants?: Restaurant[];
  onAddToFavorites?: (restaurant: Restaurant) => void;
  onDeleteRestaurant: (id: string, name: string) => void;
  onUpdateRestaurant: (id: string, updatedData: Partial<Pick<Restaurant, 'visitCount' | 'userComment' | 'customUrl' | 'genres' | 'priceRange' | 'isClosed'>>) => void;
  onFixLocation: (restaurant: Restaurant) => void;
  geocodingAddress: string | null;
  onOpenLocationEditor: (restaurant: Restaurant) => void;
  isReadOnly: boolean;
  onRefetchRestaurant: (restaurant: Restaurant) => void;
  onAnalyzeRestaurant: (restaurant: Restaurant) => void;
  isAnalyzing: boolean;
  analyzingRestaurantId?: string;
}

const RestaurantList: React.FC<RestaurantListProps> = ({
  restaurants,
  myRestaurants,
  onAddToFavorites,
  onDeleteRestaurant,
  onUpdateRestaurant,
  onFixLocation,
  geocodingAddress,
  onOpenLocationEditor,
  isReadOnly,
  onRefetchRestaurant,
  onAnalyzeRestaurant,
  isAnalyzing,
  analyzingRestaurantId,
}) => {
  if (restaurants.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-light-card dark:bg-dark-card rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border">
        <h2 className="text-2xl font-semibold text-light-text dark:text-dark-text">まだお気に入りがありません</h2>
        <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">{isReadOnly ? 'このリストにはまだお店が登録されていません。' : '「お店を探す」タブから、AIと一緒に新しい味を見つけに行きましょう！'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {restaurants.map(restaurant => (
        <RestaurantCard
          key={restaurant.id}
          restaurant={restaurant}
          myRestaurants={myRestaurants}
          onAddToFavorites={onAddToFavorites}
          onDelete={onDeleteRestaurant}
          onUpdate={onUpdateRestaurant}
          onFixLocation={onFixLocation}
          isGeocoding={geocodingAddress === `${restaurant.prefecture} ${restaurant.city} ${restaurant.address || ''}`.trim()}
          onOpenLocationEditor={onOpenLocationEditor}
          isReadOnly={isReadOnly}
          onRefetch={onRefetchRestaurant}
          onAnalyze={onAnalyzeRestaurant}
          isAnalyzing={isAnalyzing && analyzingRestaurantId === restaurant.id}
        />
      ))}
    </div>
  );
};

export default RestaurantList;