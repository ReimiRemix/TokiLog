import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Restaurant, SearchQuery, SearchResult, ManualAddFormData, UpdateRestaurantPayload, RecommendationResult, HotpepperRestaurant, Notification, ShareFilters, View, SidebarFilter } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import RestaurantInput from './components/RestaurantInput';
import RestaurantList from './components/RestaurantList';
import TimelineView from './components/TimelineView';
import SearchResultList from './components/SearchResultList';
import Sidebar from './components/Sidebar';
import AreaFilterSidebar from './components/AreaFilterSidebar';
import MenuIcon from './components/icons/MenuIcon';
import ForkKnifeIcon from './components/icons/ForkKnifeIcon';
import Login from './components/Login';
import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';
import ManualAddRestaurantModal from './components/ManualAddRestaurantModal';
import ChevronLeftIcon from './components/icons/ChevronLeftIcon';
import ChevronRightIcon from './components/icons/ChevronRightIcon';
import PlusIcon from './components/icons/PlusIcon';
import MapView from './components/MapView';
import LocationCorrectionModal from './components/LocationCorrectionModal';
import SmallLoadingSpinner from './components/icons/SmallLoadingSpinner';
import { geocodeAddress } from './services/geocodingService';
import AIAnalysisView from './components/AIAnalysisView';
import SparklesIcon from './components/icons/SparklesIcon';
import FilterIcon from './components/icons/FilterIcon';
import ChevronDownIcon from './components/icons/ChevronDownIcon';
import ConfirmationModal from './components/ConfirmationModal';
import ReadOnlyBanner from './components/ReadOnlyBanner';
import ShareModal from './components/ShareModal';
import ShareIcon from './components/icons/ShareIcon';
import ArrowUpIcon from './components/icons/ArrowUpIcon';
import ArrowDownIcon from './components/icons/ArrowDownIcon';
import { twMerge } from 'tailwind-merge';
import HeaderActionsMenu from './components/HeaderActionsMenu';
import UpdateRestaurantModal from './components/UpdateRestaurantModal';
import UserSearch from './components/UserSearch';
import FollowedUsersList from './components/FollowedUsersList';
import FollowersList from './components/FollowersList';
import StarIcon from './components/icons/StarIcon';
import SearchIcon from './components/icons/SearchIcon';
import MapPinIcon from './components/icons/MapPinIcon';
import UserIcon from './components/icons/UserIcon';
import ClockIcon from './components/icons/ClockIcon';
import UsersIcon from './components/icons/UsersIcon';
import MapIcon from './components/icons/MapIcon';
import SettingsPage from './components/SettingsPage';
import PendingRequestsList from './components/PendingRequestsList';
import BottomTabBar from './components/BottomTabBar';
import MonitoringView from './components/MonitoringView';
import NotificationsView from './components/NotificationsView';


import { getFollowersCount, getFollowingCount } from './services/followService';


export type Theme = 'light' | 'dark';
type SortType = 'createdAt' | 'visitCount' | 'prefecture' | 'city';
type SortOrder = 'asc' | 'desc';

type MenuItem = {
  id: View;
  label: string;
  icon: React.ComponentType<any>;
};

const prefectureOrder = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

const sortTypeLabels: { [key in SortType]: string } = {
  createdAt: '追加日',
  visitCount: '来店回数',
  prefecture: '都道府県',
  city: '市区町村',
};



const App: React.FC = () => {
  const queryClient = useQueryClient();
  const [hotpepperPage, setHotpepperPage] = useState(1);
  const [user, setUser] = useState<User | null>(null);
  console.log('App.tsx - user object:', user);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [currentViewedUserId, setCurrentViewedUserId] = useState<string | null>(null); // For shared links
  const [selectedFollowedUserId, setSelectedFollowedUserId] = useState<string | null>(null); // For selected followed user's restaurants
  const [authLoading, setAuthLoading] = useState(true);
  const [hotpepperResults, setHotpepperResults] = useState<SearchResult[]>([]);
  const [geminiResults, setGeminiResults] = useState<SearchResult[]>([]);
  const [activeSearchTab, setActiveSearchTab] = useState<'hotpepper' | 'ai'>('hotpepper');
  const [geminiSearchTriggered, setGeminiSearchTriggered] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState<SearchQuery | null>(null);
  const [view, setView] = useState<View>('favorites');
  const [genreFilters, setGenreFilters] = useState<string[]>([]);
  const [sidebarFilters, setSidebarFilters] = useState<SidebarFilter[]>([]);
  const [sortConfig, setSortConfig] = useState<{ by: SortType; order: SortOrder }[]>([
    { by: 'prefecture', order: 'asc' },
    { by: 'createdAt', order: 'desc' },
  ]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAreaFilterSidebarOpen, setIsAreaFilterSidebarOpen] = useState(false);
  const [isAreaFilterOverlayOpen, setIsAreaFilterOverlayOpen] = useState(false); // New state for mobile overlay
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage('sidebarCollapsed', true);
  const [isMobile, setIsMobile] = useState(false); // New state for mobile detection
  const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'dark');
  const [restaurantForLocationEdit, setRestaurantForLocationEdit] = useState<Restaurant | null>(null);
  const [restaurantToDelete, setRestaurantToDelete] = useState<{id: string, name: string} | null>(null);
  const [restaurantToUpdate, setRestaurantToUpdate] = useState<Restaurant | null>(null);
  const [addRestaurantSuccessMessage, setAddRestaurantSuccessMessage] = useState<string | null>(null);
  
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);

  
  const [shareId, setShareId] = useState<string | null>(null);

  useEffect(() => {
    setIsReadOnlyMode(!!shareId || (!!currentViewedUserId && currentViewedUserId !== user?.id));
  }, [shareId, currentViewedUserId, user?.id]);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [lockedFilters, setLockedFilters] = useState<ShareFilters>(null);
  const [showReadOnlyBanner, setShowReadOnlyBanner] = useState(true);
  
  const [geocodingAddress, setGeocodingAddress] = useState<string | null>(null);

  const touchStartX = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 75; // pixels
  const SWIPE_EDGE_WIDTH = 50; // pixels from the left edge

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSidebarOpen) return;
    const startX = e.touches[0].clientX;
    // Only consider swipes starting from the left edge of the screen
    if (startX < SWIPE_EDGE_WIDTH) {
      touchStartX.current = startX;
    } else {
      touchStartX.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    
    const endX = e.changedTouches[0].clientX;
    const deltaX = endX - touchStartX.current;

    if (deltaX > SWIPE_THRESHOLD) {
      setIsSidebarOpen(true);
    }
    touchStartX.current = null;
  };
  
  // --- Data Fetching with React Query ---

  const { data: mapsApiKey, isLoading: isMapsApiKeyLoading, error: mapsApiError } = useQuery({
    queryKey: ['mapsApiKey'],
    queryFn: async () => {
      const response = await fetch('/.netlify/functions/maps-api-key');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'APIキーの取得に失敗しました。');
      }
      const data = await response.json();
      return data.apiKey as string;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

   useEffect(() => {
    if (user && !shareId) { // Only set currentViewedUserId to user.id if not in share mode
      setCurrentViewedUserId(user.id);
    }
  }, [user, shareId]);

   // Query for the current user's restaurants
   const { data: myRestaurants = [], error: myRestaurantsError } = useQuery({
      queryKey: ['restaurants', user?.id],
      queryFn: async ({ queryKey }) => {
          const [, userId] = queryKey;
          if (!userId) return [];

          const { data, error } = await supabase.from('restaurants').select('*').eq('user_id', userId as string);
          
          if (error) throw new Error(`自分のお気に入りリストの読み込みに失敗しました: ${error.message}`);

          return data.map(r => {
            let sourcesData = r.sources;
            if (typeof sourcesData === 'string') {
              try { sourcesData = JSON.parse(sourcesData); } catch (e) { sourcesData = []; }
            }
            return {
              id: r.id, name: r.name, address: r.address, hours: r.hours, latitude: r.latitude, 
              longitude: r.longitude, prefecture: r.prefecture, city: r.city, website: r.website,
              sources: Array.isArray(sourcesData) ? sourcesData : [], visitCount: r.visit_count, 
              userComment: r.user_comment, customUrl: r.custom_url, genres: r.genres,
              createdAt: r.created_at, priceRange: r.price_range, isClosed: r.is_closed,
            };
          }) as Restaurant[];
      },
      enabled: !isReadOnlyMode && !!user && !selectedFollowedUserId, // Only fetch if not in read-only mode and user is logged in and no followed user is selected
  });

    // const { data: fetchedUserProfile, error: fetchedUserProfileError } = useQuery({
  //   queryKey: ['userProfile', user?.id],
  //   queryFn: async () => {
  //     if (!user?.id) return null;
  //     const { data, error } = await supabase
  //       .from('user_profiles')
  //       .select('username, display_name, is_super_admin')
  //       .eq('id', user.id)
  //       .single();
  //     if (error) {
  //       console.error('Error fetching user profile:', error);
  //       return null;
  //     }
  //     return data;
  //   },
  //   enabled: !!user?.id,
  //   onSuccess: (data) => {
  //     if (data) {
  //       setUserProfile(data as UserProfile);
  //     }
  //     console.log('App.tsx - fetchedUserProfile data:', data);
  //   },
  //   onError: (error) => {
  //     console.error('App.tsx - fetchedUserProfile error:', error);
  //   },
  // });

  //   queryKey: ['userProfile', user?.id],
  //   queryFn: async () => {
  //     if (!user?.id) return null;
  //     const { data, error } = await supabase
  //       .from('user_profiles')
  //       .select('username, display_name, is_super_admin')
  //       .eq('id', user.id)
  //       .single();
  //     if (error) {
  //       console.error('Error fetching user profile:', error);
  //       return null;
  //     }
  //     return data;
  //   },
  //   enabled: !!user?.id,
  //   onSuccess: (data) => {
  //     if (data) {
  //       setUserProfile(data as UserProfile);
  //     }
  //     console.log('App.tsx - fetchedUserProfile data:', data);
  //   },
  //   onError: (error) => {
  //     console.error('App.tsx - fetchedUserProfile error:', error);
  //   },
  // });

  useEffect(() => {
    const fetchUserProfileDirectly = async () => {
      if (!user?.id) {
        setUserProfile(null);
        console.log('App.tsx - Direct fetch: user ID is null.');
        return;
      }
      console.log('App.tsx - Direct fetch: Attempting to fetch user profile for ID:', user.id);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username, display_name, is_super_admin')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('App.tsx - Direct fetch error:', error);
        setUserProfile(null);
      } else if (data) {
        console.log('App.tsx - Direct fetch data:', data);
        setUserProfile(data as UserProfile);
      } else {
        console.log('App.tsx - Direct fetch: No data returned for user profile.');
        setUserProfile(null);
      }
    };

    fetchUserProfileDirectly();
  }, [user]);

  useQuery({
    queryKey: ['followCounts', user?.id],
    queryFn: async () => {
      console.log('[followCounts QueryFn] Executing for user:', user?.id);
      if (!user?.id) return { followers: 0, following: 0 };

      const followers = await getFollowersCount(user.id);
      const following = await getFollowingCount(user.id);

      // Re-add DEBUGGING ONLY: Directly set state here
      setFollowersCount(followers);
      setFollowingCount(following);
      console.log('DEBUG: Directly set followersCount to', followers, 'and followingCount to', following);

      return { followers, following }; // Still return for React Query's internal state
    },
    enabled: !!user?.id,
    refetchOnMount: true, // Keep this for now to ensure re-fetch
    onSuccess: (data) => {
      console.log('Follow counts fetched (onSuccess):', data);
      // setFollowersCount(data.followers); // Keep commented out
      // setFollowingCount(data.following); // Keep commented out
    },
    onError: (error) => {
      console.error('Error fetching follow counts (from onError):', error);
      setFollowersCount(0);
      setFollowingCount(0);
    },
  });

  useEffect(() => {
    if (userProfile) {
      console.log('App.tsx - userProfile.is_super_admin in useEffect:', userProfile.is_super_admin);
    }
  }, [userProfile]);

  // Query for a selected followed user's restaurants
  const { data: followedUserRestaurants = [], error: followedUserRestaurantsError } = useQuery({
    queryKey: ['followedUserRestaurants', selectedFollowedUserId],
    queryFn: async ({ queryKey }) => {
      const [, userIdToFetch] = queryKey;
      if (!userIdToFetch) return [];

      const { data, error } = await supabase.rpc('get_followed_user_restaurants', { p_followed_user_profile_id: userIdToFetch as string });

      if (error) throw new Error(`フォロー中ユーザーのお気に入りリストの読み込みに失敗しました: ${error.message}`);

      return data.map(r => {
        let sourcesData = r.sources;
        if (typeof sourcesData === 'string') {
          try { sourcesData = JSON.parse(sourcesData); } catch (e) { sourcesData = []; }
        }
        return {
          id: r.id, name: r.name, address: r.address, hours: r.hours, latitude: r.latitude, 
          longitude: r.longitude, prefecture: r.prefecture, city: r.city, website: r.website,
          sources: Array.isArray(sourcesData) ? sourcesData : [], visitCount: r.visit_count, 
          userComment: r.user_comment, customUrl: r.custom_url, genres: r.genres,
          createdAt: r.created_at, priceRange: r.price_range, isClosed: r.is_closed,
        };
      }) as Restaurant[];
    },
    enabled: !!selectedFollowedUserId, // Only fetch if a followed user is selected
  });

  const { data: shareData, isSuccess: isShareDataLoaded } = useQuery({
    queryKey: ['shareData', shareId],
    queryFn: async ({ queryKey }) => {
      const [, currentShareId] = queryKey;
      if (!currentShareId) return null;

      const { data, error } = await supabase
        .from('shares')
        .select('expires_at, filters')
        .eq('id', currentShareId as string)
        .single();
      
      if (error || !data) {
          throw new Error('共有リンクが見つかりません。');
      }
      if (new Date(data.expires_at) < new Date()) {
          throw new Error('この共有リンクの有効期限が切れています。');
      }
      return data;
    },
    enabled: isReadOnlyMode && !!shareId,
    retry: false,
  });

  const { data: currentViewedUserProfile, isLoading: isCurrentViewedUserProfileLoading } = useQuery({
    queryKey: ['userProfile', selectedFollowedUserId],
    queryFn: async ({ queryKey }) => {
      const [, userId] = queryKey;
      if (!userId || userId === user?.id) return null; // Don't fetch if no user selected or it's the current user

      const { data, error } = await supabase
        .from('user_profiles')
        .select('username, display_name')
        .eq('id', userId as string)
        .single();

      if (error) throw new Error(`ユーザープロフィールの読み込みに失敗しました: ${error.message}`);
      return data;
    },
    enabled: !!selectedFollowedUserId && selectedFollowedUserId !== user?.id,
  });
  
  const { data: sharedRestaurants = [], error: sharedRestaurantsError, isSuccess: isSharedRestaurantsSuccess } = useQuery({
    queryKey: ['sharedRestaurants', shareId],
    queryFn: async ({ queryKey }) => {
      const [, currentShareId] = queryKey;
      if (!currentShareId) return [];

      const { data, error } = await supabase.rpc('get_shared_restaurants_by_id', {
        share_id_param: currentShareId as string,
      });

      if (error) {
        console.error('Error fetching shared restaurants via RPC:', error);
        alert(`共有リストの読み込みに失敗しました: ${error.message}`); // 一時的にアラート表示
        throw new Error(`共有リストの読み込みに失敗しました: ${error.message}`);
      }

      return (data || []).map(r => {
        let sourcesData = r.sources;
        if (typeof sourcesData === 'string') {
          try { sourcesData = JSON.parse(sourcesData); } catch (e) { sourcesData = []; }
        }
        return {
          id: r.id, createdAt: r.created_at, name: r.name, address: r.address,
          hours: r.hours, latitude: r.latitude, longitude: r.longitude,
          prefecture: r.prefecture, city: r.city, website: r.website,
          sources: Array.isArray(sourcesData) ? sourcesData : [], visitCount: r.visit_count, userComment: r.user_comment,
          customUrl: r.custom_url, genres: r.genres, priceRange: r.price_range, isClosed: r.is_closed,
        };
      }) as Restaurant[];
    },
    enabled: isReadOnlyMode && !!shareId && isShareDataLoaded,
    retry: false,
  });

  const restaurants = useMemo(() => {
    if (selectedFollowedUserId) {
      return followedUserRestaurants;
    }
    return isReadOnlyMode ? sharedRestaurants : myRestaurants;
  }, [selectedFollowedUserId, followedUserRestaurants, isReadOnlyMode, sharedRestaurants, myRestaurants]);

  // Define the new variable for RestaurantList's read-only state
  const isRestaurantListReadOnly = !!shareId;
  
  // --- Mutations with React Query ---
  
  const geminiSearchMutation = useMutation({
    mutationFn: async (query: SearchQuery) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetch('/.netlify/functions/log-api-usage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ api_type: 'gemini-search' }),
        });
      }
      const { fetchRestaurantDetails } = await import('./services/geminiService');
      return fetchRestaurantDetails(query);
    },
    onSuccess: (data) => {
        const newGeminiResults = (data.details || []).map(detail => ({ ...detail, sources: data.sources, isFromHotpepper: false as const }));
        setGeminiResults(newGeminiResults);
    },
  });
  
  const hotpepperSearchMutation = useMutation({
    mutationFn: async (query: SearchQuery) => {
      const response = await fetch('/.netlify/functions/hotpepper-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ホットペッパーAPIでの検索に失敗しました。');
      }
      return (await response.json()) as HotpepperRestaurant[];
    },
    onSuccess: (data, query) => {
      setHotpepperResults(data);
      setSearchError(null); // Clear previous errors on new success
    },
    onError: (error) => {
      setSearchResults([]);
      setSearchError(error.message); // Set error message to display
      console.error("Hotpepper search failed:", error);
    },
  });

  const analyzeRestaurantMutation = useMutation({
    mutationFn: async (restaurant: HotpepperRestaurant) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          fetch('/.netlify/functions/log-api-usage', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ api_type: 'gemini-analyze-restaurant' }),
          });
        }
        const response = await fetch('/.netlify/functions/gemini-analyze-restaurant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(restaurant),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'AIによる店舗分析に失敗しました。');
        }
        return (await response.json()) as { comment: string, inputTokens?: number, outputTokens?: number };
    }
  });
  
  const addRestaurantMutation = useMutation({
    mutationFn: async (data: SearchResult | ManualAddFormData | Restaurant) => {
      if (!user) throw new Error("ユーザーがログインしていません。");
      
      let newRestaurantData: Pick<Restaurant, 'name' | 'address' | 'hours' | 'prefecture' | 'city' | 'website' | 'sources' | 'genres' | 'priceRange'> & { latitude: number | null, longitude: number | null };

      if ('isFromHotpepper' in data) {
        newRestaurantData = {
          name: data.name || '名称不明', address: data.address || '', hours: data.hours || '情報なし',
          latitude: data.latitude ?? null, longitude: data.longitude ?? null, prefecture: data.prefecture || '',
          city: data.city || '', website: 'siteUrl' in data ? data.siteUrl : data.website,
          sources: 'sources' in data ? data.sources : ('siteUrl' in data ? [{uri: data.siteUrl, title: data.name}] : []),
          genres: 'genre' in data ? [data.genre] : [],
          priceRange: undefined, // Hotpepper data doesn't have priceRange
        };
      } else if ('visitCount' in data) { // It's a Restaurant object
        newRestaurantData = {
            name: data.name, address: data.address, hours: data.hours, prefecture: data.prefecture,
            city: data.city, website: data.website, sources: data.sources, genres: data.genres,
            priceRange: data.priceRange, latitude: data.latitude, longitude: data.longitude,
        };
      } else { // It's ManualAddFormData
        newRestaurantData = { ...data, latitude: null, longitude: null, sources: [] };
      }

      if (!newRestaurantData.name || !newRestaurantData.prefecture || !newRestaurantData.city) throw new Error("店舗情報が不完全です。");
      
      let { latitude, longitude } = newRestaurantData;
      if (latitude === null || longitude === null) {
          const fullAddress = `${newRestaurantData.prefecture} ${newRestaurantData.city} ${newRestaurantData.address}`;
          try {
              const coords = await handleGeocode(fullAddress);
              latitude = coords.latitude; longitude = coords.longitude;
          } catch (e) {
              console.warn("Geocoding failed, saving without coordinates.", e);
          }
      }

      const { data: newRestaurantRecord, error } = await supabase.from('restaurants').insert({
        user_id: user.id, name: newRestaurantData.name, address: newRestaurantData.address, hours: newRestaurantData.hours,
        latitude: latitude, longitude: longitude, prefecture: newRestaurantData.prefecture, city: newRestaurantData.city,
        website: newRestaurantData.website, sources: newRestaurantData.sources, genres: newRestaurantData.genres,
        price_range: newRestaurantData.priceRange,
      }).select().single();

      if (error) throw new Error(`お気に入りへの追加に失敗しました: ${error.message}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['restaurants', user?.id] });
      // Invalidation for notifications is now handled by the realtime subscription,
      // but we keep this one for the user who performed the action, ensuring an immediate update.
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      const restaurantName = (variables && 'name' in variables) ? variables.name : '不明な店舗';
      setAddRestaurantSuccessMessage(`「${restaurantName}」をお気に入りに追加しました！`);
      setIsManualAddModalOpen(false);
      // setSearchResults([]); // Keep search results visible
      // setCurrentSearchQuery(null); // Keep current search query
    },
    onError: (error) => {
      setAddRestaurantSuccessMessage(null);
      alert(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    },
  });

  const updateRestaurantMutation = useMutation({
    mutationFn: async ({ id, updatedData }: UpdateRestaurantPayload) => {
      const { error } = await supabase.from('restaurants').update({
        visit_count: updatedData.visitCount, user_comment: updatedData.userComment,
        custom_url: updatedData.customUrl, genres: updatedData.genres,
        latitude: updatedData.latitude, longitude: updatedData.longitude,
        price_range: updatedData.priceRange, is_closed: updatedData.isClosed,
      }).eq('id', id);
      if (error) throw new Error(`更新に失敗しました: ${error.message}`);
    },
    onSuccess: (_, { id, updatedData }) => {
      queryClient.invalidateQueries({ queryKey: ['restaurants', user?.id] });
      
      // Manually update the displayed list to prevent re-sorting
      setDisplayedRestaurants(prev => 
          prev.map(r => r.id === id ? { ...r, ...updatedData } : r)
      );

      if(updatedData.latitude !== undefined) setRestaurantForLocationEdit(null);
    },
    onError: (error) => alert(`更新エラー: ${error instanceof Error ? error.message : '不明なエラー'}`),
  });

  const deleteRestaurantMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('restaurants').delete().eq('id', id);
      if (error) throw new Error(`削除に失敗しました: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants', user?.id] });
      setRestaurantToDelete(null);
    },
    onError: (error) => alert(`削除エラー: ${error instanceof Error ? error.message : '不明なエラー'}`),
  });

  const createShareLinkMutation = useMutation({
    mutationFn: async (filters: ShareFilters) => {
      const { data, error } = await supabase.rpc('create_share_link', {
          filters_param: filters,
      });
      if (error) throw new Error(`共有リンクの作成に失敗しました: ${error.message}`);
      return data as string;
    },
    onSuccess: (shareUuid) => {
      const shareUrl = new URL(window.location.href);
      shareUrl.search = `?share=${shareUuid}`;
      setShareLink(shareUrl.toString());
    },
    onError: (error) => alert(error instanceof Error ? error.message : '共有リンクの作成中にエラーが発生しました。'),
  });

  useEffect(() => {
    if (isShareDataLoaded && shareData?.filters && Object.keys(shareData.filters).length > 0) {
      const filters = shareData.filters as ShareFilters;
      setLockedFilters(filters);
      setSidebarFilters(filters.sidebarFilters || []);
      setGenreFilters(filters.genreFilters || []);
    }
  }, [isShareDataLoaded, shareData]);

  useEffect(() => {
    if (isSharedRestaurantsSuccess && sharedRestaurants.length === 0 && isReadOnlyMode && shareId) {
      console.log('Shared restaurants query returned empty data on smartphone.');
      console.log('Current shareId:', shareId);
      console.log('isReadOnlyMode:', isReadOnlyMode);
      // ここでさらにデバッグ情報を追加することも可能
    }
  }, [isSharedRestaurantsSuccess, sharedRestaurants, isReadOnlyMode, shareId]);

  // --- Effects ---
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      console.log('Current authenticated user ID:', session?.user?.id); // TEMPORARY LOG

      // If user is logged in, invalidate userProfile query to ensure it fetches
      if (session?.user) {
        queryClient.invalidateQueries({ queryKey: ['userProfile', session.user.id] });
      }

      // If the user is logged out (session is null), reset all view-related states
      // to ensure a clean return to the login page.
      if (!session) {
        // On initial load for an anonymous user on a shared page, don't reset the share state.
        if (!sessionStorage.getItem('shareId')) {
          setIsReadOnlyMode(false);
          setShareId(null);
          setCurrentViewedUserId(null);
          sessionStorage.removeItem('shareId');
        }
      }

      // Only stop the auth loading indicator if not in a share session,
      // as the share session logic will handle it.
      if (!sessionStorage.getItem('shareId')) {
        setAuthLoading(false);
      }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const shareIdFromUrl = urlParams.get('share');
    const shareIdFromSession = sessionStorage.getItem('shareId');

    let effectiveShareId: string | null = null;

    if (shareIdFromUrl) {
      effectiveShareId = shareIdFromUrl;
      sessionStorage.setItem('shareId', shareIdFromUrl);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('share');
      window.history.replaceState({}, document.title, newUrl.toString());
    } else if (shareIdFromSession) {
      effectiveShareId = shareIdFromSession;
    }

    if (effectiveShareId) {
      setShareId(effectiveShareId);
      setIsReadOnlyMode(true);
      setAuthLoading(false); // Ready to render read-only view
    } else {
      // This is not a share session, clear any old session shareId just in case
      sessionStorage.removeItem('shareId');
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    // If the view changes to anything other than 'search', reset search-related state
    if (view !== 'search') {
      setHotpepperResults([]);
      setGeminiResults([]);
      setCurrentSearchQuery(null);
      setSearchError(null);
      setHotpepperPage(1);
    }
    // If the view changes to anything other than 'followed', deselect any followed user
    if (view !== 'followed') {
      setSelectedFollowedUserId(null);
    }
  }, [view]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Event Handlers ---
  const handleSearch = (query: SearchQuery) => {
    setView('search');
    setHotpepperResults([]);
    setGeminiResults([]);
    setActiveSearchTab('hotpepper');
    setCurrentSearchQuery(query);
    setHotpepperPage(1); // Reset page to 1 on new search
    setGeminiSearchTriggered(false);
    setAddRestaurantSuccessMessage(null); // Clear success message on new search
    setSearchError(null); // Clear previous errors on new search
    hotpepperSearchMutation.mutate({ ...query, page: 1 });
  };

  const handleHotpepperPageChange = (newPage: number) => {
    if (!currentSearchQuery) return;
    setHotpepperPage(newPage);
    hotpepperSearchMutation.mutate({ ...currentSearchQuery, page: newPage });
  };
  
  const handleGeocode = async (address: string) => {
      if (!mapsApiKey) throw new Error("マップAPIキーがありません。");
      setGeocodingAddress(address);
      try {
        return await geocodeAddress(mapsApiKey, address);
      } finally {
        setGeocodingAddress(null);
      }
  };

  const handleFixLocation = async (restaurant: Restaurant) => {
      const fullAddress = `${restaurant.prefecture} ${restaurant.city} ${restaurant.address || ''}`.trim();
      try {
        const { latitude, longitude } = await handleGeocode(fullAddress);
        updateRestaurantMutation.mutate({ id: restaurant.id, updatedData: { latitude, longitude } });
      } catch (error) {
        alert(error instanceof Error ? error.message : "座標の取得に失敗しました。");
      }
  };
  
  const handleSaveLocation = async (id: string, newCoords: {lat: number, lng: number}) => {
    updateRestaurantMutation.mutate({id, updatedData: { latitude: newCoords.lat, longitude: newCoords.lng }});
  };

  const handleUpdateRestaurant = (id: string, updatedData: Partial<Pick<Restaurant, 'visitCount' | 'userComment' | 'customUrl' | 'genres'>>) => {
    updateRestaurantMutation.mutate({ id, updatedData });
  };
  
  const handleConfirmDelete = () => {
    if (restaurantToDelete) deleteRestaurantMutation.mutate(restaurantToDelete.id);
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentViewedUserId(null); // ログアウト時に閲覧中のユーザーIDをクリア
    setIsReadOnlyMode(false); // ログアウト時に閲覧者モードを解除
    setShareId(null); // 共有IDをクリア
    sessionStorage.removeItem('shareId'); // セッションストレージからもクリア
    window.location.href = '/'; // ログインTOPへ強制的にリダイレクト
  };
  
  const handleScrollToRestaurant = (restaurantId: string) => {
    setView('favorites');
    setIsSidebarOpen(false);
    setTimeout(() => {
      const element = document.getElementById(`restaurant-${restaurantId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element?.classList.add('animate-pulse-once');
      setTimeout(() => element?.classList.remove('animate-pulse-once'), 2000);
    }, 100);
  };

  const toggleSort = (by: SortType) => {
    setSortConfig(prev => {
        const existingIndex = prev.findIndex(s => s.by === by);
        if (existingIndex > -1) {
            return prev.filter((_, i) => i !== existingIndex);
        } else {
            const defaultOrder = (by === 'createdAt' || by === 'visitCount') ? 'desc' : 'asc';
            return [...prev, { by, order: defaultOrder }];
        }
    });
  };

  const setSortOrder = (by: SortType, order: SortOrder) => {
      setSortConfig(prev => prev.map(s => s.by === by ? { ...s, order } : s));
  };

  const handleOpenShareModal = () => {
    setShareLink(''); // Reset link to regenerate it with current filters
    setIsShareModalOpen(true);
    const activeFilters = (sidebarFilters.length > 0 || (genreFilters.length > 0))
      ? { sidebarFilters, genreFilters }
      : null;
    createShareLinkMutation.mutate(activeFilters as any);
  };

  // --- Display State ---
  const [displayedRestaurants, setDisplayedRestaurants] = useState<Restaurant[]>([]);

  // --- Memoized data ---
  useEffect(() => {
    let result = [...restaurants];

    // Filter out closed restaurants for map view, only if current view is map
    if (view === 'map') {
      result = result.filter(r => !r.isClosed);
    }
    
    if (sidebarFilters.length > 0) {
      result = result.filter(r => 
        sidebarFilters.some(filter => r[filter.type] === filter.value)
      );
    }

    if (genreFilters.length > 0) {
      result = result.filter(r => r.genres && genreFilters.some(g => r.genres.includes(g)));
    }
    
    result.sort((a, b) => {
      for (const sort of sortConfig) {
        let comparison = 0;
        switch (sort.by) {
          case 'visitCount':
            comparison = (a.visitCount || 0) - (b.visitCount || 0);
            break;
          case 'prefecture':
            const prefectureAIndex = prefectureOrder.indexOf(a.prefecture);
            const prefectureBIndex = prefectureOrder.indexOf(b.prefecture);
            comparison = prefectureAIndex - prefectureBIndex;
            break;
          case 'city':
            comparison = a.city.localeCompare(b.city, 'ja');
            break;
          case 'createdAt':
          default:
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
        }
        if (comparison !== 0) {
          return sort.order === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });

    setDisplayedRestaurants(result);
  }, [restaurants, sidebarFilters, genreFilters, sortConfig, view]);

  const allGenres = useMemo(() => {
    const genresSet = new Set<string>();
    restaurants.forEach(r => r.genres?.forEach(g => genresSet.add(g)));
    return [...Array.from(genresSet).sort((a, b) => a.localeCompare(b, 'ja'))];
  }, [restaurants]);
  
  const activeFiltersForModal: ShareFilters = useMemo(() => {
    if (sidebarFilters.length > 0 || (genreFilters.length > 0)) {
        return { sidebarFilters, genreFilters };
    }
    return null;
  }, [sidebarFilters, genreFilters]);



  // --- Render logic ---
  if (authLoading) {
    return <div className="flex items-center justify-center h-screen"><SmallLoadingSpinner /></div>;
  }
  if (!user && !isReadOnlyMode) {
    return <Login />;
  }

  return (
    <>
      
      
      
      {isReadOnlyMode && showReadOnlyBanner && !shareId && <ReadOnlyBanner isFiltered={!!lockedFilters} />}
      <div className={`flex h-screen ${isReadOnlyMode ? 'pt-10' : ''}`}>
        <Sidebar
          restaurants={isReadOnlyMode ? displayedRestaurants : restaurants}
          prefectureOrder={prefectureOrder}
          onFilterChange={setSidebarFilters}
          onScrollToRestaurant={handleScrollToRestaurant}
          activeFilter={sidebarFilters}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          isReadOnly={isReadOnlyMode}
          isMobile={isMobile} // Pass isMobile prop
          userProfile={userProfile}
          isSuperAdmin={userProfile?.is_super_admin || false}
          followersCount={followersCount}
          followingCount={followingCount}
          onSelectMenuItem={(selectedView: View | 'notifications') => {
            if (selectedView === 'areaFilter') {
              if (isMobile) {
                setIsAreaFilterOverlayOpen(true);
                setIsAreaFilterSidebarOpen(false); // Ensure side-by-side is closed
              } else {
                setIsAreaFilterSidebarOpen(prev => !prev);
                setIsAreaFilterOverlayOpen(false); // Ensure overlay is closed
              }
            } else {
              setView(selectedView);
              setIsAreaFilterSidebarOpen(false); // Close side-by-side when other menu item is selected
              setIsAreaFilterOverlayOpen(false); // Close overlay when other menu item is selected
            }
          }}
          onToggleAreaFilter={() => setIsAreaFilterSidebarOpen(!isAreaFilterSidebarOpen)}
          currentView={view}
        />
        {(isAreaFilterSidebarOpen || isAreaFilterOverlayOpen) && (
          <AreaFilterSidebar
            restaurants={isReadOnlyMode ? displayedRestaurants : restaurants}
            prefectureOrder={prefectureOrder}
            onFilterChange={setSidebarFilters}
            onScrollToRestaurant={handleScrollToRestaurant}
            activeFilter={sidebarFilters}
            isOpen={isAreaFilterSidebarOpen || isAreaFilterOverlayOpen} // Open if either is true
                      onClose={() => {
                        if (isMobile) {
                          setIsAreaFilterOverlayOpen(false);
                          setIsSidebarOpen(true); // Return to main sidebar on mobile
                                    } else {
                                      setIsAreaFilterSidebarOpen(false);
                                      setIsSidebarOpen(false); // Close main sidebar on desktop
                                    }                        setSidebarFilters([]); // Clear active filters when closing
                        setView('favorites'); // Set view to favorites to clear area filter selection
                      }}            isReadOnly={isReadOnlyMode}
            isMobile={isMobile}
            isOverlayMode={isAreaFilterOverlayOpen} // New prop
            style={isMobile ? {} : { left: isSidebarCollapsed ? '5rem' : '20rem' }} // Apply style only for desktop
          />
        )}
        {isAreaFilterOverlayOpen && (
            <div 
                className="fixed inset-0 bg-black/50 z-50 md:hidden" 
                onClick={() => setIsAreaFilterOverlayOpen(false)}
                aria-hidden="true"
            />
        )}
        <main 
          className={twMerge(
            "flex-1 overflow-y-auto transition-all duration-300 ease-in-out",
            "md:transition-[margin-left]", // Add transition for margin
            isSidebarCollapsed ? "md:ml-20" : "md:ml-80",
            isAreaFilterSidebarOpen && (isSidebarCollapsed ? "md:ml-[calc(5rem+20rem)]" : "md:ml-[calc(20rem+20rem)]"),
          "pb-16 md:pb-0"
          )}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="bg-light-bg dark:bg-dark-bg border-b border-light-border dark:border-dark-border">
              <div className="px-6 md:px-8 max-w-4xl mx-auto pt-6 md:pt-8">
                <header className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4 justify-start flex-shrink-0">
                     <button onClick={() => setIsSidebarOpen(true)} className={`p-2 md:hidden ${!isSidebarCollapsed || (isReadOnlyMode && !lockedFilters) ? 'md:invisible' : ''}`}><MenuIcon /></button>
                     {!(isReadOnlyMode && lockedFilters) && <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:flex p-2 items-center gap-2 text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-md">
                        {isSidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />} <span>メニュー</span>
                     </button>}
                  </div>
                  <div className="flex items-center gap-2 justify-center flex-grow">
                      <ForkKnifeIcon className="w-6 h-6 md:w-auto" />
                      <h1 className="text-xl md:text-3xl font-bold text-light-text dark:text-dark-text tracking-tight">Gourmet Log</h1>
                  </div>
                  <div className="flex items-center gap-2 justify-end flex-shrink-0">
                    {!isReadOnlyMode && user && (
                      <HeaderActionsMenu 
                        user={user} 
                        onScrollToRestaurant={handleScrollToRestaurant}
                        theme={theme}
                        setTheme={setTheme}
                        onLogout={handleLogout}
                      />
                    )}
                  </div>
                </header>

                
            </div>
          </div>
          
          <div className="p-6 md:p-8 max-w-4xl mx-auto">
            <div className="space-y-8">
              {view === 'search' && !isReadOnlyMode && (
                <>
                  <RestaurantInput onSearch={handleSearch} isLoading={hotpepperSearchMutation.isPending || geminiSearchMutation.isPending} />
                  {searchError && (
                    <div className="p-4 my-4 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 rounded-md text-center">
                      <p className="font-semibold">検索結果がありません</p>
                      <p className="text-sm mt-1">{searchError}</p>
                    </div>
                  )}
                  <div className="border-b border-light-border dark:border-dark-border">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                      <button
                        onClick={() => setActiveSearchTab('hotpepper')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                          activeSearchTab === 'hotpepper'
                            ? 'border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary'
                            : 'border-transparent text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        ホットペッパー
                      </button>
                      <button
                        onClick={() => {
                          setActiveSearchTab('ai');
                          if (currentSearchQuery && !geminiResults.length && !geminiSearchMutation.isPending) {
                            geminiSearchMutation.mutate(currentSearchQuery);
                          }
                        }}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                          activeSearchTab === 'ai'
                            ? 'border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary'
                            : 'border-transparent text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        AI検索
                        {geminiSearchMutation.isPending && <SmallLoadingSpinner className="inline ml-2" />}
                      </button>
                    </nav>
                  </div>

                  <div className="mt-6">
                    {activeSearchTab === 'hotpepper' && (
                      <>
                        <SearchResultList 
                          results={hotpepperResults} 
                          onAddToFavorites={addRestaurantMutation.mutate}
                          favoriteRestaurants={restaurants}
                          isAddingToFavorites={addRestaurantMutation.isPending}
                          onAnalyzeRestaurant={analyzeRestaurantMutation.mutateAsync}
                        />
                        {hotpepperResults.length > 0 && (
                          <div className="flex justify-center items-center space-x-4 mt-6">
                            <button
                              onClick={() => handleHotpepperPageChange(hotpepperPage - 1)}
                              disabled={hotpepperPage === 1 || hotpepperSearchMutation.isPending}
                              className="px-4 py-2 text-sm font-semibold rounded-md bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors disabled:opacity-50"
                            >
                              前のページ
                            </button>
                            <span className="text-light-text dark:text-dark-text">{hotpepperPage}</span>
                            <button
                              onClick={() => handleHotpepperPageChange(hotpepperPage + 1)}
                              disabled={hotpepperResults.length < 50 || hotpepperSearchMutation.isPending}
                              className="px-4 py-2 text-sm font-semibold rounded-md bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors disabled:opacity-50"
                            >
                              次のページ
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {activeSearchTab === 'ai' && (
                      <>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">AIがWeb検索を行い、最適な候補を提案します。ホットペッパーにないお店が見つかるかもしれません。</p>
                        <SearchResultList 
                          results={geminiResults} 
                          onAddToFavorites={addRestaurantMutation.mutate}
                          favoriteRestaurants={restaurants}
                          isAddingToFavorites={addRestaurantMutation.isPending}
                          onAnalyzeRestaurant={analyzeRestaurantMutation.mutateAsync}
                        />
                      </>
                    )}
                  </div>

                </>
              )}
              {view === 'userSearch' && !isReadOnlyMode && user && (
                <UserSearch user={user} />
              )}
              {view === 'followed' && !isReadOnlyMode && (
                <>
                  {selectedFollowedUserId ? (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">
                        {currentViewedUserProfile
                          ? `${currentViewedUserProfile.display_name || currentViewedUserProfile.username}さんのお気に入り`
                          : '読み込み中...'}
                      </h2>
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <button onClick={() => setIsFilterVisible(!isFilterVisible)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <FilterIcon /> フィルター <ChevronDownIcon className={`w-4 h-4 transition-transform ${isFilterVisible ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      {isFilterVisible && (
                        <div className="p-4 bg-light-card dark:bg-dark-card rounded-ui-medium border border-light-border dark:border-dark-border grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 animate-slide-down">
                          <div>
                            <label htmlFor="genre-filter" className="block text-sm font-medium mb-2">ジャンル</label>
                            <div className="flex flex-wrap gap-2">
                              <button
                                  onClick={() => setGenreFilters([])}
                                  className={twMerge(
                                      "px-3 py-1.5 text-sm font-semibold rounded-full transition-colors",
                                      genreFilters.length === 0
                                          ? "bg-light-primary text-white dark:bg-dark-primary dark:text-slate-900"
                                          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700"
                                  )}
                              >すべて</button>
                              {allGenres.map(g => (
                                  <button
                                      key={g}
                                      onClick={() => setGenreFilters(prev => prev.includes(g) ? prev.filter(f => f !== g) : [...prev, g])}
                                      className={twMerge(
                                          "px-3 py-1.5 text-sm font-semibold rounded-full transition-colors",
                                          genreFilters.includes(g)
                                              ? "bg-light-primary text-white dark:bg-dark-primary dark:text-slate-900"
                                              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700"
                                      )}
                                  >{g}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">並び替え</label>
                            <div className="flex flex-wrap items-center gap-2">
                              {Object.entries(sortTypeLabels).map(([key, label]) => {
                                const sortKey = key as SortType;
                                const currentSort = sortConfig.find(s => s.by === sortKey);
                                const isActive = !!currentSort;

                                return (
                                  <div
                                    key={sortKey}
                                    className={twMerge(
                                      "flex items-center border rounded-full transition-colors",
                                      isActive
                                        ? "border-light-primary dark:border-dark-primary bg-light-primary-soft-bg dark:bg-dark-primary-soft-bg"
                                        : "border-light-border dark:border-dark-border bg-slate-100 dark:bg-slate-700/50"
                                    )}
                                  >
                                    <button
                                      onClick={() => toggleSort(sortKey)}
                                      className={twMerge(
                                        "pl-3 pr-2 py-1 text-sm font-semibold",
                                        isActive ? "text-light-primary dark:text-dark-primary" : ""
                                      )}
                                    >
                                      {label}
                                    </button>
                                    {isActive && (
                                      <div className="flex items-center border-l border-light-primary/50 dark:border-dark-primary/50">
                                        <button
                                          onClick={() => setSortOrder(sortKey, 'asc')}
                                          className={twMerge(
                                            "p-1.5",
                                            currentSort.order === 'asc' ? "text-light-primary dark:text-dark-primary" : "text-light-text-secondary dark:text-dark-text-secondary"
                                          )}
                                        >
                                          <ArrowUpIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => setSortOrder(sortKey, 'desc')}
                                          className={twMerge(
                                            "p-1.5",
                                            currentSort.order === 'desc' ? "text-light-primary dark:text-dark-primary" : "text-light-text-secondary dark:text-dark-text-secondary"
                                          )}
                                        >
                                          <ArrowDownIcon className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                      <RestaurantList
                        restaurants={displayedRestaurants}
                        myRestaurants={myRestaurants}
                        onAddToFavorites={addRestaurantMutation.mutate}
                        onDeleteRestaurant={(id, name) => setRestaurantToDelete({id, name})}
                        onUpdateRestaurant={handleUpdateRestaurant}
                        onFixLocation={handleFixLocation}
                        geocodingAddress={geocodingAddress}
                        onOpenLocationEditor={setRestaurantForLocationEdit}
                        isReadOnly={true}
                        onRefetchRestaurant={setRestaurantToUpdate}
                      />
                      <button
                        onClick={() => setSelectedFollowedUserId(null)}
                        className="mt-4 px-4 py-2 text-sm font-semibold rounded-md bg-light-primary text-white hover:bg-light-primary-hover dark:bg-dark-primary dark:text-slate-900 dark:hover:bg-dark-primary-hover transition-colors"
                      >
                        フォロー中のユーザーリストに戻る
                      </button>
                    </div>
                  ) : (
                    <FollowedUsersList onSelectUser={(userId) => {
                      setSelectedFollowedUserId(userId);
                      // No need to setView('followed') again as we are already in 'followed' view
                    }} />
                  )}
                </>
              )}
              {view === 'favorites' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-4 text-light-text dark:text-dark-text">
                    {currentViewedUserId && currentViewedUserProfile
                      ? `${currentViewedUserProfile.display_name || currentViewedUserProfile.username}さんのお気に入り`
                      : 'あなたのお気に入り'}
                  </h2>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                     {!(isReadOnlyMode) && 
                        <button onClick={() => setIsFilterVisible(!isFilterVisible)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <FilterIcon /> フィルター <ChevronDownIcon className={`w-4 h-4 transition-transform ${isFilterVisible ? 'rotate-180' : ''}`} />
                        </button>
                     }
                     {/* Ensure the button group has a placeholder to prevent layout shifts */}
                     {(isReadOnlyMode) && <div className="w-full sm:w-auto" />}

                    <div className="flex items-center gap-2">
                      {!isReadOnlyMode && !selectedFollowedUserId && (
                        <>
                          <button onClick={() => setIsManualAddModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md bg-slate-600 text-white hover:bg-slate-700 transition-colors"><PlusIcon /><span>手動で作成</span></button>
                          <button onClick={() => setView('search')} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md bg-slate-600 text-white hover:bg-slate-700 transition-colors"><SearchIcon className="w-4 h-4" /><span>お店を探す</span></button>
                          <button onClick={handleOpenShareModal} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md bg-slate-600 text-white hover:bg-slate-700 transition-colors"><ShareIcon /><span>共有</span></button>
                        </>
                      )}
                    </div>
                  </div>
                   {isFilterVisible && !isReadOnlyMode && (
                      <div className="p-4 bg-light-card dark:bg-dark-card rounded-ui-medium border border-light-border dark:border-dark-border grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 animate-slide-down">
                        <div>
                          <label htmlFor="genre-filter" className="block text-sm font-medium mb-2">ジャンル</label>
                          <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setGenreFilters([])}
                                className={twMerge(
                                    "px-3 py-1.5 text-sm font-semibold rounded-full transition-colors",
                                    genreFilters.length === 0
                                        ? "bg-light-primary text-white dark:bg-dark-primary dark:text-slate-900"
                                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700"
                                )}
                            >すべて</button>
                            {allGenres.map(g => (
                                <button
                                    key={g}
                                    onClick={() => setGenreFilters(prev => prev.includes(g) ? prev.filter(f => f !== g) : [...prev, g])}
                                    className={twMerge(
                                        "px-3 py-1.5 text-sm font-semibold rounded-full transition-colors",
                                        genreFilters.includes(g)
                                            ? "bg-light-primary text-white dark:bg-dark-primary dark:text-slate-900"
                                            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700"
                                    )}
                                >{g}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">並び替え</label>
                          <div className="flex flex-wrap items-center gap-2">
                            {Object.entries(sortTypeLabels).map(([key, label]) => {
                              const sortKey = key as SortType;
                              const currentSort = sortConfig.find(s => s.by === sortKey);
                              const isActive = !!currentSort;

                              return (
                                <div
                                  key={sortKey}
                                  className={twMerge(
                                    "flex items-center border rounded-full transition-colors",
                                    isActive
                                      ? "border-light-primary dark:border-dark-primary bg-light-primary-soft-bg dark:bg-dark-primary-soft-bg"
                                      : "border-light-border dark:border-dark-border bg-slate-100 dark:bg-slate-700/50"
                                  )}
                                >
                                  <button
                                    onClick={() => toggleSort(sortKey)}
                                    className={twMerge(
                                      "pl-3 pr-2 py-1 text-sm font-semibold",
                                      isActive ? "text-light-primary dark:text-dark-primary" : ""
                                    )}
                                  >
                                    {label}
                                  </button>
                                  {isActive && (
                                    <div className="flex items-center border-l border-light-primary/50 dark:border-dark-primary/50">
                                      <button
                                        onClick={() => setSortOrder(sortKey, 'asc')}
                                        className={twMerge(
                                          "p-1.5",
                                          currentSort.order === 'asc' ? "text-light-primary dark:text-dark-primary" : "text-light-text-secondary dark:text-dark-text-secondary"
                                        )}
                                      >
                                        <ArrowUpIcon className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => setSortOrder(sortKey, 'desc')}
                                        className={twMerge(
                                          "p-1.5",
                                          currentSort.order === 'desc' ? "text-light-primary dark:text-dark-primary" : "text-light-text-secondary dark:text-dark-text-secondary"
                                        )}
                                      >
                                        <ArrowDownIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                   )}
                  <RestaurantList 
                    restaurants={displayedRestaurants}
                    onDeleteRestaurant={(id, name) => setRestaurantToDelete({id, name})}
                    onUpdateRestaurant={handleUpdateRestaurant}
                    onFixLocation={handleFixLocation}
                    geocodingAddress={geocodingAddress}
                    onOpenLocationEditor={setRestaurantForLocationEdit}
                    isReadOnly={isRestaurantListReadOnly}
                    onRefetchRestaurant={setRestaurantToUpdate}
                  />
                </div>
              )}
              {view === 'map' && (
                isMapsApiKeyLoading ? (
                  <div className="text-center flex items-center justify-center py-16 px-6 bg-light-card dark:bg-dark-card rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border" style={{ height: 'calc(100vh - 340px)', width: '100%' }}>
                    <div>
                      <SmallLoadingSpinner />
                      <p className="text-light-text dark:text-dark-text mt-4">マップAPIキーを読み込み中...</p>
                    </div>
                  </div>
                ) : mapsApiError ? (
                  <div className="text-center flex items-center justify-center py-16 px-6 bg-light-card dark:bg-dark-card rounded-ui-medium shadow-soft border border-light-border dark:border-dark-border" style={{ height: 'calc(100vh - 340px)', width: '100%' }}>
                    <div>
                      <h2 className="text-2xl font-semibold text-light-text dark:text-dark-text">マップの読み込みに失敗しました</h2>
                      <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">エラー: {mapsApiError.message}</p>
                      <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">Google Maps APIキーが正しく設定されているか確認してください。</p>
                    </div>
                  </div>
                ) : mapsApiKey ? (
                  <MapView restaurants={displayedRestaurants} apiKey={mapsApiKey} />
                ) : (
                  // Fallback for unexpected state, though covered by mapsApiError or isMapsApiKeyLoading
                  <div>マップの読み込み中...</div>
                )
              )}
              {view === 'analysis' && !isReadOnlyMode && user && (
                <AIAnalysisView 
                    restaurants={restaurants}
                    user={user}
                    onScrollToRestaurant={handleScrollToRestaurant}
                />
              )}

              {view === 'timeline' && !isReadOnlyMode && (
                <TimelineView />
              )}
              {view === 'followers' && !isReadOnlyMode && (
                <FollowersList onSelectUser={(userId) => {
                  setSelectedFollowedUserId(userId);
                  setView('followed'); // Switch to followed view to show their restaurants
                }} />
              )}
              {view === 'notifications' && !isReadOnlyMode && (
                <NotificationsView />
              )}
              {view === 'settings' && !isReadOnlyMode && (
                <SettingsPage />
              )}

              {view === 'monitoring' && !isReadOnlyMode && userProfile?.is_super_admin && (
                <MonitoringView />
              )}

            </div>
          </div>
        </main>
      </div>

      {!isReadOnlyMode && isManualAddModalOpen && (
        <ManualAddRestaurantModal 
            onClose={() => setIsManualAddModalOpen(false)}
            onAddRestaurant={(data) => addRestaurantMutation.mutateAsync(data)}
            isAdding={addRestaurantMutation.isPending}
        />
      )}
      {!isReadOnlyMode && restaurantForLocationEdit && mapsApiKey && (
        <LocationCorrectionModal
          restaurant={restaurantForLocationEdit}
          onClose={() => setRestaurantForLocationEdit(null)}
          onSave={handleSaveLocation}
          apiKey={mapsApiKey}
        />
      )}
      {!isReadOnlyMode && restaurantToDelete && (
        <ConfirmationModal
          isOpen={!!restaurantToDelete}
          onClose={() => setRestaurantToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="お気に入りの削除"
        >
            <p><strong>{restaurantToDelete.name}</strong> をお気に入りリストから本当に削除しますか？この操作は元に戻せません。</p>
        </ConfirmationModal>
      )}
      {!isReadOnlyMode && isShareModalOpen && (
          <ShareModal 
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            shareUrl={shareLink}
            isLoading={createShareLinkMutation.isPending}
            activeFilters={activeFiltersForModal}
          />
      )}

      {restaurantToUpdate && (
        <UpdateRestaurantModal
          restaurant={restaurantToUpdate}
          onClose={() => setRestaurantToUpdate(null)}
          onConfirmUpdate={(id, data) => {
            updateRestaurantMutation.mutate({ id, updatedData: data });
            alert("レストラン情報を更新しました。");
          }}
        />
      )}

      {!isReadOnlyMode && user && <BottomTabBar currentView={view} onSelectView={setView} />}
    </>
  );
};

export default App;
