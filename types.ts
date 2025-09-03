

export type View = 'favorites' | 'search' | 'map' | 'analysis' | 'userSearch' | 'followed' | 'timeline' | 'areaList' | 'followers' | 'settings' | 'pendingRequests' | 'admin_user_management' | 'monitoring';
export type SidebarFilter = { type: 'prefecture' | 'city'; value: string };

export interface Source {
  uri: string;
  title: string;
}

export interface Restaurant {
  id: string;
  createdAt: string;
  name: string;
  address: string;
  hours: string;
  priceRange?: string;
  isClosed?: boolean;
  latitude: number;
  longitude: number;
  prefecture: string;
  city: string;
  website?: string;
  sources?: Source[];
  visitCount: number;
  userComment: string;
  customUrl?: string;
  genres?: string[];
}

export interface RestaurantDetails {
  name: string | null;
  address: string | null;
  hours: string | null;
  priceRange?: string | null;
  isClosed?: boolean;
  latitude: number | null;
  longitude: number | null;
  prefecture: string | null;
  city: string | null;
  website?: string | null;
}

export interface SearchQuery {
  prefecture: string;
  prefecture_code?: string;
  large_area_code?: string;
  city?: string;
  small_area_code?: string;
  genre: string;
  genre_text?: string;
  storeName: string;
  small_area_text?: string;
}

export type ManualAddFormData = Pick<Restaurant, 'name' | 'prefecture' | 'city' | 'address' | 'hours' | 'website' | 'genres' | 'priceRange'>;

export type UpdateRestaurantPayload = {
  id: string;
  updatedData: Partial<Pick<Restaurant, 'visitCount' | 'userComment' | 'customUrl' | 'genres' | 'latitude' | 'longitude' | 'priceRange' | 'isClosed'>>;
};

// For Hotpepper API response
export interface HotpepperRestaurant {
  id: string;
  name: string;
  address: string;
  hours: string; // 'open' field
  latitude: number;
  longitude: number;
  prefecture: string;
  city: string;
  genre: string;
  catch: string; // catch copy
  photoUrl: string; // photo.pc.l
  siteUrl: string; // urls.pc
  isFromHotpepper: true;
}

// For Gemini search result
export interface GeminiRestaurant extends RestaurantDetails {
  sources?: Source[];
  isFromHotpepper: false;
}

export type SearchResult = HotpepperRestaurant | GeminiRestaurant;

// For AI Recommendation result
export interface Recommendation {
  id: string;
  name: string;
  reason: string;
}

export interface RecommendationResult {
  recommendations: Recommendation[];
  summary: string;
}

// For Notifications
export interface Notification {
  id: string;
  created_at: string;
  user_id: string;
  type: 'new_favorite' | 'follow_request' | 'follow_accepted';
  from_user_id?: string; // 通知の発生元ユーザー
  restaurant_id?: string;
  restaurant_name?: string;
  message?: string; // カスタムメッセージ
  is_read: boolean;
}

// For Chat with AI
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatHistory {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
  messages: ChatMessage[];
}

// For Share functionality
export type ShareFilters = {
  sidebarFilters: SidebarFilter[];
  genreFilters: string[];
} | null;

export interface UserProfile {
  username: string;
  display_name: string;
  avatar_url: string;
  is_super_admin: boolean;
}
