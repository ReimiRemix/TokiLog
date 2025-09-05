import React, { useState, useMemo, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import type { Restaurant, SidebarFilter } from '../types';
import ChevronDownIcon from './icons/ChevronDownIcon';
import XIcon from './icons/XIcon';
import SearchIcon from './icons/SearchIcon';

interface AreaFilterSidebarProps {
  restaurants: Restaurant[];
  prefectureOrder: string[];
  onFilterChange: (filters: SidebarFilter[]) => void;
  onScrollToRestaurant: (restaurantId: string) => void;
  activeFilter: SidebarFilter[];
  isOpen: boolean;
  onClose: () => void;
  isReadOnly: boolean;
  style?: React.CSSProperties;
}

const AreaFilterSidebar: React.FC<AreaFilterSidebarProps> = ({
  restaurants,
  prefectureOrder,
  onFilterChange,
  onScrollToRestaurant,
  activeFilter,
  isOpen,
  onClose,
  isReadOnly,
  style,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});

  const grouped = useMemo(() => {
    return restaurants.reduce<Record<string, Record<string, Restaurant[]>>>((acc, restaurant) => {
      const { prefecture, city } = restaurant;
      if (!acc[prefecture]) {
        acc[prefecture] = {};
      }
      if (!acc[prefecture][city]) {
        acc[prefecture][city] = [];
      }
      acc[prefecture][city].push(restaurant);
      return acc;
    }, {});
  }, [restaurants]);

  const sortedPrefectures = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => {
      const indexA = prefectureOrder.indexOf(a);
      const indexB = prefectureOrder.indexOf(b);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  }, [grouped, prefectureOrder]);

  const lowercasedQuery = searchQuery.toLowerCase();

  const filteredPrefectures = useMemo(() => {
    if (!lowercasedQuery) return sortedPrefectures;
    return sortedPrefectures.filter(prefecture => {
      if (prefecture.toLowerCase().includes(lowercasedQuery)) return true;
      const cities = grouped[prefecture];
      return Object.entries(cities).some(([city, cityRestaurants]) => {
        if (city.toLowerCase().includes(lowercasedQuery)) return true;
        return cityRestaurants.some(r => r.name.toLowerCase().includes(lowercasedQuery));
      });
    });
  }, [sortedPrefectures, grouped, lowercasedQuery]);

  useEffect(() => {
    if (lowercasedQuery) {
      const newExpanded: { [key: string]: boolean } = {};
      filteredPrefectures.forEach(pref => {
        newExpanded[pref] = true;
        const cities = grouped[pref];
        Object.keys(cities).forEach(city => {
            const cityRestaurants = cities[city];
            if (city.toLowerCase().includes(lowercasedQuery) || cityRestaurants.some(r => r.name.toLowerCase().includes(lowercasedQuery))) {
                newExpanded[`${pref}-${city}`] = true;
            }
        });
      });
      setExpanded(newExpanded);
    } else {
      setExpanded({});
    }
  }, [lowercasedQuery, filteredPrefectures, grouped]);

  const togglePrefectureExpansion = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFilterClick = (type: 'prefecture' | 'city', value: string) => {
    const newFilter = { type, value };
    const existingIndex = activeFilter.findIndex(f => f.type === type && f.value === value);

    if (existingIndex > -1) {
      onFilterChange(activeFilter.filter((_, i) => i !== existingIndex));
    } else {
      onFilterChange([...activeFilter, newFilter]);
    }
  };

  return (
    <aside
      className={twMerge(
        "fixed inset-y-0 z-40 h-full bg-light-card dark:bg-dark-card border-r border-light-border dark:border-dark-border p-4 flex flex-col",
        "transform transition-transform duration-300 ease-in-out",
        "w-80", // Fixed width
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
      style={style}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">エリアで絞り込み</h3>
        <button onClick={onClose} className="p-1 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text" aria-label="閉じる">
          <XIcon className="w-6 h-6" />
        </button>
      </div>
      {!isReadOnly && (
        <div className="relative mb-4">
          <input
            type="search"
            placeholder="エリアや店名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md focus:ring-2 focus:ring-light-primary focus:border-light-primary placeholder:text-light-text-secondary dark:placeholder:text-dark-text-secondary"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <SearchIcon className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto -mr-4 pr-4">
        {filteredPrefectures.length > 0 ? (
          <ul className="space-y-1">
            {filteredPrefectures.map((prefecture) => {
              const cities = grouped[prefecture];
              const isPrefectureActive = activeFilter.some(f => f.type === 'prefecture' && f.value === prefecture);
              const totalCount = Object.values(cities).flat().length;

              const filteredCities = Object.entries(cities).filter(([city, cityRestaurants]) => {
                if (!lowercasedQuery) return true;
                if (prefecture.toLowerCase().includes(lowercasedQuery)) return true;
                if (city.toLowerCase().includes(lowercasedQuery)) return true;
                return cityRestaurants.some(r => r.name.toLowerCase().includes(lowercasedQuery));
              });

              return (
                <li key={prefecture}>
                  <div className={twMerge("flex items-center justify-between rounded-md transition-colors", isPrefectureActive ? 'bg-light-primary-soft-bg dark:bg-dark-primary-soft-bg' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50')}>
                    <button
                      onClick={() => handleFilterClick('prefecture', prefecture)}
                      disabled={isReadOnly}
                      className={twMerge(
                          'flex-grow text-left py-1.5 font-bold text-base flex items-center gap-3 transition-colors',
                          isPrefectureActive ? 'text-light-primary dark:text-dark-primary' : 'text-light-text dark:text-dark-text',
                          isPrefectureActive ? 'pl-2 border-l-4 border-light-primary dark:border-dark-primary' : 'pl-3 border-l-4 border-transparent',
                          isReadOnly && 'cursor-not-allowed'
                      )}
                    >
                      {prefecture}
                      <span className="ml-auto text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary bg-slate-200 dark:bg-slate-700 rounded-full px-2 py-0.5">{totalCount}</span>
                    </button>
                    <button onClick={() => togglePrefectureExpansion(prefecture)} className="p-1.5 mr-1 rounded-md text-light-text-secondary dark:text-dark-text-secondary">
                      <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${expanded[prefecture] ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {expanded[prefecture] && (
                    <ul className="pl-4 mt-1 space-y-1 border-l-2 border-light-border dark:border-dark-border ml-2">
                      {filteredCities.map(([city, cityRestaurants]) => {
                        const isCityActive = activeFilter.some(f => f.type === 'city' && f.value === city);
                        const filteredRestaurants = cityRestaurants.filter(r =>
                            !lowercasedQuery ||
                            prefecture.toLowerCase().includes(lowercasedQuery) ||
                            city.toLowerCase().includes(lowercasedQuery) ||
                            r.name.toLowerCase().includes(lowercasedQuery)
                        );

                        return (
                          <li key={city}>
                            <div className={twMerge("flex items-center justify-between rounded-md transition-colors", isCityActive ? 'bg-light-primary-soft-bg dark:bg-dark-primary-soft-bg' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50')}>
                              <button
                                  onClick={() => handleFilterClick('city', city)}
                                  disabled={isReadOnly}
                                  className={twMerge(
                                      'flex-grow text-left py-1 flex items-center gap-3',
                                      isCityActive ? 'text-light-primary dark:text-dark-primary font-semibold' : 'text-light-text-secondary dark:text-dark-text-secondary',
                                      isCityActive ? 'pl-2 border-l-4 border-light-primary dark:border-dark-primary' : 'pl-3 border-l-4 border-transparent',
                                      isReadOnly && 'cursor-not-allowed'
                                  )}
                              >
                                  {city}
                                  <span className="ml-auto text-xs font-normal text-light-text-secondary dark:text-dark-text-secondary bg-slate-200 dark:bg-slate-700 rounded-full px-2 py-0.5">{cityRestaurants.length}</span>
                              </button>
                              <button onClick={() => togglePrefectureExpansion(`${prefecture}-${city}`)} className="p-1.5 mr-1 rounded-md text-light-text-secondary dark:text-dark-text-secondary">
                                  <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${expanded[`${prefecture}-${city}`] ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                            {expanded[`${prefecture}-${city}`] && (
                              <ul className="pl-4 mt-1">
                                {filteredRestaurants.map(restaurant => (
                                  <li key={restaurant.id}>
                                    <button
                                      onClick={() => onScrollToRestaurant(restaurant.id)}
                                      className="w-full text-left px-2 py-1 text-sm font-normal text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-md truncate transition-colors"
                                      title={restaurant.name}
                                    >
                                      {restaurant.name}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary mt-8">
            検索条件に一致するお店は見つかりませんでした。
          </p>
        )}
      </div>
    </aside>
  );
};

export default AreaFilterSidebar;