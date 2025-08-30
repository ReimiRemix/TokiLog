import React from 'react';
import { useQuery } from '@tanstack/react-query';
import LoadingSpinner from './icons/LoadingSpinner';
import type { Restaurant } from '../types'; // Assuming Restaurant type is sufficient
import RestaurantCard from './RestaurantCard'; // Re-use RestaurantCard for display

interface TimelineRestaurant extends Restaurant {
  user_profile: {
    username: string;
    display_name: string | null;
  };
}

const TimelineView: React.FC = () => {
  const { data: timelineRestaurants, isLoading, error } = useQuery<TimelineRestaurant[]> ({
    queryKey: ['timelineRestaurants'],
    queryFn: async () => {
      console.log('Fetching timeline data...');
      const response = await fetch('/.netlify/functions/get-followed-users-timeline-restaurants');
      
      const rawResponseText = await response.text(); // Read raw response text for all cases
      console.log('Timeline fetch response status:', response.ok); // Log status
      console.log('Timeline fetch raw response text:', rawResponseText); // Log raw response text

      if (!response.ok) {
        let errorMessage = 'タイムラインの読み込みに失敗しました。';
        try {
          const errorData = JSON.parse(rawResponseText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `エラー (${response.status}): ${response.statusText || rawResponseText || errorMessage}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = JSON.parse(rawResponseText); // Parse the raw text
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <LoadingSpinner />
        <span className="ml-2 text-light-text dark:text-dark-text">タイムラインを読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">エラー: {error.message}</div>;
  }

  if (!timelineRestaurants || timelineRestaurants.length === 0) {
    return <div className="text-light-text-secondary dark:text-dark-text-secondary p-4 text-center">まだタイムラインに表示するお気に入りはありません。</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">タイムライン</h2>
      <div className="space-y-4">
        {timelineRestaurants.map((restaurant) => (
          <div key={restaurant.id} className="bg-light-card dark:bg-dark-card p-4 rounded-md shadow-sm border border-light-border dark:border-dark-border">
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
              <span className="font-semibold text-light-text dark:text-dark-text">
                {restaurant.user_profile.display_name || `@${restaurant.user_profile.username}`}
              </span> がお気に入りに追加しました
              {restaurant.createdAt && (
                <span className="ml-2">({new Date(restaurant.createdAt).toLocaleDateString()})</span>
              )}
            </p>
            <RestaurantCard
              restaurant={restaurant}
              onDelete={() => {}} // No delete
              onUpdate={() => {}} // No update
              onFixLocation={() => {}} // No fix location
              geocodingAddress={null} // Not relevant for timeline
              onOpenLocationEditor={() => {}} // No location editor
              isReadOnly={true} // Always read-only in timeline
              onRefetch={() => {}} // No refetch
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineView;
