

import { createClient } from '@supabase/supabase-js';

// ！！！【重要】！！！
// 以下のsupabaseUrlとsupabaseAnonKeyを、ご自身のSupabaseプロジェクトの設定に置き換えてください。
// この設定は、Supabaseプロジェクトの「Project Settings」>「API」タブにあります。
const supabaseUrl = 'https://erlpxamurfvsguzjlpfj.supabase.co'; // "https://..." で始まるURL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybHB4YW11cmZ2c2d1empscGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwODc0NTYsImV4cCI6MjA3MTY2MzQ1Nn0.UqOPBg0QpPpMZMGyie_JWN0rLEKyOf3eX076xJeOey8'; // "eyJhbGciOi..." で始まる長いキー

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
Supabaseテーブル設定:
Supabaseプロジェクトで、以下のSQLエディタからSQLを実行して`restaurants`テーブルを作成してください。
Row Level Security (RLS)も有効にすることを強く推奨します。

1. テーブル作成
CREATE TABLE public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    hours TEXT DEFAULT '情報なし'::text,
    latitude REAL,
    longitude REAL,
    prefecture TEXT NOT NULL,
    city TEXT NOT NULL,
    website TEXT,
    sources JSONB,
    visit_count INTEGER DEFAULT 0 NOT NULL,
    user_comment TEXT DEFAULT ''::text,
    custom_url TEXT DEFAULT ''::text,
    genres TEXT[]
);

2. RLS (Row Level Security) の有効化
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

3. ポリシー作成（データの所有者のみがアクセスできるようにする）
CREATE POLICY "Allow users to manage their own restaurants"
ON public.restaurants
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

4. リアルタイム通知の有効化
-- Supabaseダッシュボード > Database > Replication で "restaurants" テーブルのスイッチをONにするか、
-- 以下のSQLを実行します。
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;


-- [Share Functionality - START]
-- NOTE: The following SQL defines a secure RPC-based sharing mechanism.
-- Please run these commands in your Supabase SQL editor.

-- 5. 共有リンク用テーブル作成 (Create shares table)
CREATE TABLE IF NOT EXISTS public.shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours') NOT NULL,
    filters JSONB -- NEW: Add a column to store filters for the shared view
);

CREATE INDEX IF NOT EXISTS shares_user_id_idx ON public.shares (user_id);
CREATE INDEX IF NOT EXISTS shares_expires_at_idx ON public.shares (expires_at);

-- 6. 共有テーブルのRLS有効化 (Enable RLS for shares table)
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- 7. 共有テーブルのポリシー作成 (Create policies for shares table)
-- Drop old policies to ensure this script is re-runnable
DROP POLICY IF EXISTS "Allow users to manage their own shares" ON public.shares;
DROP POLICY IF EXISTS "Allow anonymous read access to shares table" ON public.shares;

-- Policy for owners to manage their own links
CREATE POLICY "Allow users to manage their own shares"
ON public.shares
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy to allow anyone to check the status of a share link.
-- This is needed on the client to show specific error messages (e.g., "expired").
CREATE POLICY "Allow anonymous read access to shares table"
ON public.shares
FOR SELECT
TO anon, authenticated
USING (true);


-- 8. RPC関数作成 (共有リンクの作成/取得) - SECURE VERSION
-- Drop the old function if it exists without parameters
DROP FUNCTION IF EXISTS public.create_share_link();
DROP FUNCTION IF EXISTS public.create_share_link(JSONB);

CREATE OR REPLACE FUNCTION public.create_share_link(filters_param JSONB DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '';
AS $$
DECLARE
  share_uuid UUID;
BEGIN
  INSERT INTO public.shares (user_id, filters)
  VALUES (auth.uid(), filters_param)
  RETURNING id INTO share_uuid;
  
  RETURN share_uuid;
END;
$$;


-- 9. RPC関数作成 (共有されたレストランリストの取得)
DROP FUNCTION IF EXISTS public.get_shared_restaurants_by_id(UUID);

CREATE OR REPLACE FUNCTION public.get_shared_restaurants_by_id(share_id_param UUID)
RETURNS SETOF restaurants
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = '';
AS $$
DECLARE
  target_user_id UUID;
  share_filters JSONB;
BEGIN
  -- 1. Find the user_id and filters associated with the share link
  SELECT user_id, filters INTO target_user_id, share_filters
  FROM public.shares
  WHERE id = share_id_param;

  -- 2. If a user was found, return their restaurants, applying filters if they exist
  IF target_user_id IS NOT NULL THEN
    RETURN QUERY
    SELECT *
    FROM public.restaurants r
    WHERE r.user_id = target_user_id
    AND (
      share_filters IS NULL OR (
        -- Apply sidebar filter (prefecture or city)
        (
          share_filters->'sidebarFilter' IS NULL OR
          share_filters->'sidebarFilter'->>'type' IS NULL OR
          (share_filters->'sidebarFilter'->>'type' = 'prefecture' AND r.prefecture = share_filters->'sidebarFilter'->>'value') OR
          (share_filters->'sidebarFilter'->>'type' = 'city' AND r.city = share_filters->'sidebarFilter'->>'value')
        )
        AND
        -- Apply genre filter
        (
          share_filters->>'genreFilter' IS NULL OR
          share_filters->>'genreFilter' = 'all' OR
          -- Use @> operator to check if genres array contains the value
          r.genres @> ARRAY[share_filters->>'genreFilter']
        )
      )
    );
  END IF;
END;
$$;


-- [Share Functionality - END]


-- [Notifications - START]
-- 10. 通知用テーブル作成
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    restaurant_name TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 11. RLS有効化とポリシー作成
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to access their own notifications"
ON public.notifications
FOR ALL
USING (auth.uid() = user_id);

-- 12. リアルタイム通知の有効化
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- [Notifications - END]


-- [Chat History - START]
-- 13. チャット履歴用テーブル作成
CREATE TABLE public.chat_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    title TEXT NOT NULL,
    messages JSONB NOT NULL
);

-- 14. RLS有効化とポリシー作成
ALTER TABLE public.chat_histories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage their own chat histories"
ON public.chat_histories
FOR ALL
USING (auth.uid() = user_id);

-- [Chat History - END]

*/
