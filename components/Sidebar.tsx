import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { twMerge } from 'tailwind-merge';
import type { Restaurant, SidebarFilter, View, UserProfile } from '../types'; // Import View from types.ts
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
import LockIcon from './icons/LockIcon';
import minerucaIcon from '/mineruca_icon.png';
import ActivityIcon from './icons/ActivityIcon';
import { useLocalStorage } from '../hooks/useLocalStorage';

type MenuItem = {
  id: View | 'settings' | 'notifications'; // Add 'notifications' to View type for internal use
  label: string;
  icon: React.ComponentType<any>;
};

const defaultMenuItems: MenuItem[] = [
  { id: 'favorites', label: 'お気に入り', icon: StarIcon },
  { id: 'search', label: 'お店を探す', icon: SearchIcon },
  { id: 'userSearch', label: 'ユーザーを探す', icon: UsersIcon },
  { id: 'areaFilter', label: 'エリアで絞り込み', icon: MapPinIcon },
  { id: 'notifications', label: '通知', icon: BellIcon }, // New menu item
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
  isMobile: boolean; // New prop
  onSelectMenuItem: (viewId: View | 'notifications') => void; // Update type here
  onToggleAreaFilter: () => void; // Add this prop back
  currentView: View;
  userProfile: UserProfile | null;
  followersCount: number;
  followingCount: number;
  isSuperAdmin: boolean;
  unreadNotificationCount: number;
  isSharedLinkAnonymous?: boolean; // New prop
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
  isMobile, // Destructure new prop
  onSelectMenuItem,
  onToggleAreaFilter, // Destructure the new prop
  currentView,
  userProfile,
  followersCount,
  followingCount,
  isSuperAdmin,
  unreadNotificationCount,
  isSharedLinkAnonymous,
}) => {

  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});

  const menuItems = useMemo(() => {
    let items = [...defaultMenuItems];
    if (isSharedLinkAnonymous) {
      items = items.filter(item => item.id === 'areaFilter');
    } else if (isSuperAdmin) {
      // 管理者用の項目を追加
      items.push({ id: 'monitoring', label: '監視', icon: ActivityIcon });
    }
    return items;
  }, [isSuperAdmin, isSharedLinkAnonymous]);

  const [orderedMenuItems, setOrderedMenuItems] = useLocalStorage<MenuItem[]>('sidebarMenuItems', menuItems);

  useEffect(() => {
    const hasMonitoringInStorage = orderedMenuItems.some(item => item.id === 'monitoring');
    const shouldHaveMonitoring = isSuperAdmin;

    if (shouldHaveMonitoring !== hasMonitoringInStorage) {
      setOrderedMenuItems(menuItems);
    }
  }, [isSuperAdmin, menuItems, orderedMenuItems, setOrderedMenuItems]);

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

  const moveMenuItem = useCallback((index: number, direction: 'up' | 'down') => {
    setOrderedMenuItems(prevItems => {
      const newItems = [...prevItems];
      const itemToMove = newItems[index];
      if (direction === 'up') {
        if (index === 0) return prevItems;
        newItems.splice(index, 1);
        newItems.splice(index - 1, 0, itemToMove);
      } else { // 'down'
        if (index === newItems.length - 1) return prevItems;
        newItems.splice(index, 1);
        newItems.splice(index + 1, 0, itemToMove);
      }
      return newItems;
    });
  }, [setOrderedMenuItems]);

  const showFullContent = !isCollapsed || (isOpen && isMobile);

  return (
    <aside
      className={twMerge(
        "fixed inset-y-0 left-0 z-50 h-full bg-light-card dark:bg-dark-card border-r border-light-border dark:border-dark-border p-4 flex flex-col",
        "transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0 w-80" : "-translate-x-full w-80",
        "md:fixed md:translate-x-0",
        isCollapsed ? "md:w-20" : "md:w-80"
      )}
    >
      <div className="flex justify-between items-center mb-4">
        <button onClick={onClose} className="p-1 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text md:hidden" aria-label="メニューを閉じる">
          <XIcon className="w-6 h-6" />
        </button>
      </div>

      {showFullContent && userProfile && (
        <div className="mb-4 p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border">
          <p className="font-semibold text-light-text dark:text-dark-text">{userProfile.display_name || userProfile.username}</p>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">@{userProfile.username}</p>
          <div className="flex justify-around mt-2 text-sm">
            <button
              onClick={() => {
                onSelectMenuItem('followed');
                onClose();
              }}
              className="text-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors flex-1"
            >
              <p className="font-bold text-light-text dark:text-dark-text">{followingCount}</p>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">フォロー中</p>
            </button>
            <button
              onClick={() => {
                onSelectMenuItem('followers');
                onClose();
              }}
              className="text-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors flex-1"
            >
              <p className="font-bold text-light-text dark:text-dark-text">{followersCount}</p>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">フォロワー</p>
            </button>
          </div>
          
        </div>
      )}

        <nav className="flex-1 -mr-2 pr-2 mb-4 border-b border-light-border dark:border-dark-border pb-4">
          <ul className="space-y-1">
            {orderedMenuItems.map((item, index) => (
              <li key={item.id} className="flex items-center group">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    if (item.id === 'areaFilter') { 
                      onToggleAreaFilter();
                    } else {
                      onSelectMenuItem(item.id as View);
                    }
                  }}
                  className={twMerge(
                    "flex-1 flex items-center rounded-md text-sm font-medium transition-colors w-full",
                    showFullContent ? "gap-3 px-3 py-2" : "justify-center px-0 py-2", // Adjusted for collapsed state
                    currentView === item.id
                      ? "bg-light-primary-soft-bg text-light-primary dark:bg-dark-primary-soft-bg dark:text-dark-primary"
                      : "text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700/50"
                  )}
                >
                  {item.icon && <item.icon className="w-5 h-5" />}
                  {showFullContent && <span className="flex-grow text-left">{item.label}</span>}
                  {showFullContent && item.id === 'notifications' && unreadNotificationCount > 0 && (
                    <span className="ml-auto text-xs font-semibold bg-red-500 text-white rounded-full px-2 py-0.5">
                      {unreadNotificationCount}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

        </nav>

        {currentView === 'areaFilter' && showFullContent && (
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            <div className="mb-4">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary" />
                <input
                  type="text"
                  placeholder="都道府県、市区町村、店舗名で検索"
                  className="w-full pl-10 pr-4 py-2 rounded-md bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text"
                    aria-label="検索をクリア"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <ul className="space-y-1">
              {filteredPrefectures.map(prefecture => {
                const prefectureRestaurants = Object.values(grouped[prefecture]).flat();
                const isPrefectureExpanded = expanded[prefecture];
                const filteredCityEntries = Object.entries(grouped[prefecture]).filter(([city, cityRestaurants]) => {
                  if (!lowercasedQuery) return true;
                  return city.toLowerCase().includes(lowercasedQuery) || cityRestaurants.some(r => r.name.toLowerCase().includes(lowercasedQuery));
                });

                if (prefectureRestaurants.length === 0 || (lowercasedQuery && filteredCityEntries.length === 0 && !prefecture.toLowerCase().includes(lowercasedQuery))) {
                  return null; // Hide prefecture if no matching restaurants or cities after filtering
                }

                return (
                  <li key={prefecture}>
                    <button
                      onClick={() => togglePrefectureExpansion(prefecture)}
                      className="flex items-center w-full text-left font-medium text-light-text dark:text-dark-text hover:bg-slate-100 dark:hover:bg-slate-700/50 p-2 rounded-md"
                    >
                      <ChevronDownIcon className={twMerge("w-4 h-4 mr-2 transition-transform", isPrefectureExpanded ? "rotate-0" : "-rotate-90")} />
                      <span className="flex-grow text-left truncate">{prefecture} ({prefectureRestaurants.length})</span>
                      {activeFilter.some(f => f.type === 'prefecture' && f.value === prefecture) ? (
                        <XIcon className="w-4 h-4 ml-2 text-light-primary dark:text-dark-primary" onClick={(e) => { e.stopPropagation(); handleFilterClick('prefecture', prefecture); }} />
                      ) : (
                        <MapPinIcon className="w-4 h-4 ml-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-primary dark:hover:text-dark-primary" onClick={(e) => { e.stopPropagation(); handleFilterClick('prefecture', prefecture); }} />
                      )}
                    </button>
                    {isPrefectureExpanded && (
                      <ul className="pl-6 pr-2 py-1 space-y-1">
                        {filteredCityEntries.map(([city, cityRestaurants]) => (
                          <li key={city}>
                            <button
                              onClick={() => togglePrefectureExpansion(`${prefecture}-${city}`)}
                              className="flex items-center w-full text-left text-sm text-light-text dark:text-dark-text hover:bg-slate-100 dark:hover:bg-slate-700/50 p-1 rounded-md"
                            >
                              <ChevronDownIcon className={twMerge("w-4 h-4 mr-2 transition-transform", expanded[`${prefecture}-${city}`] ? "rotate-0" : "-rotate-90")} />
                              <span className="flex-grow text-left truncate">{city} ({cityRestaurants.length})</span>
                            </button>
                            {expanded[`${prefecture}-${city}`] && (
                              <ul className="pl-8 pr-2 py-1 space-y-1">
                                {cityRestaurants
                                  .filter(r => !lowercasedQuery || r.name.toLowerCase().includes(lowercasedQuery) || city.toLowerCase().includes(lowercasedQuery) || prefecture.toLowerCase().includes(lowercasedQuery))
                                  .map(r => (
                                    <li key={r.id}>
                                      <button 
                                        onClick={() => onScrollToRestaurant(r.id)}
                                        className="w-full text-left text-sm text-light-text-secondary dark:text-dark-text-secondary hover:text-light-primary dark:hover:text-dark-primary truncate p-1 rounded-md"
                                        title={r.name}
                                      >
                                        {r.name}
                                      </button>
                                    </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
    </aside>
  );
};

export default Sidebar;
