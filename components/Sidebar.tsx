import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { twMerge } from 'tailwind-merge';
import type { Restaurant, SidebarFilter, View } from '../types'; // Import View from types.ts
import ChevronDownIcon from './icons/ChevronDownIcon';
import XIcon from './icons/XIcon';
import SearchIcon from './icons/SearchIcon';
import MapPinIcon from './icons/MapPinIcon';
import StarIcon from './icons/StarIcon';
import UserIcon from './icons/UserIcon';
import ClockIcon from './icons/ClockIcon';
import UsersIcon from './icons/UsersIcon';
import MapIcon from './icons/MapIcon';
import SparklesIcon from './icons/SparklesIcon';
import SettingsIcon from './icons/SettingsIcon';
import ArrowUpIcon from './icons/ArrowUpIcon';
import ArrowDownIcon from './icons/ArrowDownIcon';
import BellIcon from './icons/BellIcon'; // Import BellIcon for pending requests
import { useLocalStorage } from '../hooks/useLocalStorage';
import FollowRequestList from './FollowRequestList';

type MenuItem = {
  id: View | 'settings' | 'pendingRequests'; // Add 'pendingRequests' to View type for internal use
  label: string;
  icon: React.ComponentType<any>;
};

const defaultMenuItems: MenuItem[] = [
  { id: 'favorites', label: 'お気に入り', icon: StarIcon },
  { id: 'search', label: 'お店を探す', icon: SearchIcon },
  { id: 'userSearch', label: 'ユーザーを探す', icon: SearchIcon },
  { id: 'followed', label: 'フォロー中', icon: UserIcon },
  { id: 'followers', label: 'フォロワー', icon: UsersIcon },
  { id: 'pendingRequests', label: '保留中リクエスト', icon: BellIcon }, // New menu item
  { id: 'map', label: 'マップ', icon: MapIcon },
  { id: 'analysis', label: 'AIに相談', icon: SparklesIcon },
  { id: 'settings', label: '設定', icon: SettingsIcon },
];

interface SidebarProps {
  restaurants: Restaurant[];
  prefectureOrder: string[];
  onFilterChange: (filters: SidebarFilter[]) => void;
  onScrollToRestaurant: (restaurantId: string) => void;
  activeFilter: SidebarFilter[];
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  isReadOnly: boolean;
  onSelectMenuItem: (viewId: View | 'pendingRequests') => void; // Update type here
  currentView: View;
}

const Sidebar: React.FC<SidebarProps> = ({
  restaurants,
  prefectureOrder,
  onFilterChange,
  onScrollToRestaurant,
  activeFilter,
  isOpen,
  onClose,
  isCollapsed,
  isReadOnly,
  onSelectMenuItem,
  currentView,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  const [orderedMenuItems, setOrderedMenuItems] = useLocalStorage<MenuItem[]>('sidebarMenuItems', defaultMenuItems);
  const [isEditingMenu, setIsEditingMenu] = useState(false);

  useEffect(() => {
    // Validate orderedMenuItems from localStorage on mount
    if (!Array.isArray(orderedMenuItems) || orderedMenuItems.length === 0 || orderedMenuItems.some(item => !item.id || !item.label || !item.icon)) {
      console.warn("Invalid or empty sidebar menu items found in localStorage. Resetting to default.");
      setOrderedMenuItems(defaultMenuItems);
      localStorage.removeItem('sidebarMenuItems');
    }
  }, [orderedMenuItems, setOrderedMenuItems]);

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

  const moveMenuItem = useCallback((index: number, direction: 'up' | 'down') => {
    setOrderedMenuItems(prevItems => {
      const newItems = [...prevItems];
      const itemToMove = newItems[index];
      if (direction === 'up') {
        if (index === 0) return prevItems; // Already at the top
        newItems.splice(index, 1);
        newItems.splice(index - 1, 0, itemToMove);
      } else { // 'down'
        if (index === newItems.length - 1) return prevItems; // Already at the bottom
        newItems.splice(index, 1);
        newItems.splice(index + 1, 0, itemToMove);
      }
      return newItems;
    });
  }, [setOrderedMenuItems]);

  return (
    <aside
      className={twMerge(
        "fixed inset-y-0 left-0 z-50 h-full bg-light-card dark:bg-dark-card border-r border-light-border dark:border-dark-border p-4 flex flex-col",
        "transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0 w-80" : "-translate-x-full w-80", // Mobile: always full width when open
        "md:relative md:translate-x-0", // Desktop: always visible
        isCollapsed ? "md:w-20" : "md:w-80" // Desktop: control width based on collapsed state
      )}
    >
      <div className="flex justify-between items-center mb-4">
        {!isCollapsed && (
          <h2 className="text-xl font-bold text-light-text dark:text-dark-text">Gourmet Log</h2>
        )}
        <button onClick={onClose} className="p-1 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text md:hidden" aria-label="メニューを閉じる">
          <XIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Main Navigation Menu - Hide if it's a shared link */}
      {!isReadOnly && (
        <nav className="flex-1 overflow-y-auto -mr-2 pr-2 mb-4 border-b border-light-border dark:border-dark-border pb-4">
          <ul className="space-y-1">
            {orderedMenuItems.map((item, index) => (
              <li key={item.id} className="flex items-center group">
                <button
                  onClick={() => {
                    onSelectMenuItem(item.id as View);
                    onClose();
                  }}
                  className={twMerge(
                    "flex-1 flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    currentView === item.id
                      ? "bg-light-primary-soft-bg text-light-primary dark:bg-dark-primary-soft-bg dark:text-dark-primary"
                      : "text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700/50"
                  )}
                >
                  {item.icon && <item.icon className="w-5 h-5" />}
                  {(!isCollapsed || (isOpen && window.innerWidth < 768)) && <span>{item.label}</span>}
                </button>
                {!isCollapsed && isEditingMenu && item.id !== 'settings' && ( // Don't allow reordering 'Settings'
                  <div className="flex ml-2">
                    <button
                      onClick={() => moveMenuItem(index, 'up')}
                      className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600/50"
                      title="上に移動"
                    >
                      <ArrowUpIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveMenuItem(index, 'down')}
                      className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600/50"
                      title="下に移動"
                    >
                      <ArrowDownIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Location Filtering Section */}
      <div className="flex-1 overflow-y-auto -mr-2 pr-2">
          {!isCollapsed && (
            <>
              <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-3">エリアで絞り込み</h3>
              {/* Search input remains hidden if isReadOnly is true */}
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
            </>
          )}
          {isCollapsed && (
            <div className="flex items-center justify-center h-full flex-col"> {/* Added flex-col for stacking */}
              <MapPinIcon className="w-6 h-6 text-light-text-secondary dark:text-dark-text-secondary" />
              {/* Always show text for area filter, even when collapsed, especially on mobile */}
              <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">エリアで絞り込み</span>
            </div>
          )}
        </div>
      </aside>
  );
};

export default Sidebar;