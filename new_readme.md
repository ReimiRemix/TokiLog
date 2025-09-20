# oplix-LocationRecord プロジェクト概要

## 1. プロジェクトの目的

このプロジェクトは、ユーザーがレストラン情報を管理、検索、分析、推薦できるWebアプリケーションです。主に以下の機能を提供します。

*   レストラン情報の表示と管理
*   Gemini API を利用したレストランの分析、推薦、検索
*   Hot Pepper API を利用したレストラン情報の取得
*   ユーザー認証とデータ管理 (Firebase/Supabase)

## 2. 主要技術スタック

*   **フロントエンド:** React, TypeScript, Vite
*   **バックエンド (Serverless Functions):** Netlify Functions (TypeScript)
*   **データベース/認証:** Firebase, Supabase
*   **AI/検索:** Google Gemini API
*   **レストラン情報:** Hot Pepper Webサービス API

## 3. ディレクトリ・ファイル構成

### ルートディレクトリ

*   `.gitignore`: Gitのバージョン管理から除外するファイルやディレクトリを指定します。
*   `App.tsx`: アプリケーションのメインコンポーネントであり、ルーティングやグローバルな状態管理を設定します。
*   `firebaseConfig.ts`: Firebaseプロジェクトの設定情報が含まれます。
*   `index.html`: アプリケーションのエントリーポイントとなるHTMLファイルです。
*   `index.tsx`: ReactアプリケーションをDOMにマウントする役割を担います。
*   `metadata.json`: プロジェクトに関するメタデータ（詳細不明な場合は一般的な説明）
*   `netlify.toml`: Netlifyのデプロイ設定ファイルです。リダイレクトルールやビルド設定などが含まれます。
*   `package-lock.json`: `package.json` に基づく依存関係の正確なツリーを記録します。
*   `package.json`: プロジェクトのメタデータ、依存関係、スクリプトなどが定義されています。
*   `README.md`: プロジェクトの概要やセットアップ方法などを記述するファイルです。
*   `supabaseClient.ts`: Supabaseクライアントの初期化と設定が含まれます。
*   `tsconfig.json`: TypeScriptコンパイラの設定ファイルです。
*   `types.ts`: アプリケーション全体で使用されるTypeScriptの型定義が含まれます。
*   `vite.config.ts`: Viteビルドツールの設定ファイルです。
*   `.git/`: Gitリポジトリの管理情報が含まれます。
*   `.netlify/`: Netlify CLIやデプロイ関連のキャッシュなどが含まれます。
*   `node_modules/`: プロジェクトの依存関係（ライブラリ）がインストールされるディレクトリです。

### `components/` ディレクトリ

アプリケーションのUIコンポーネントが格納されています。

*   `AdminPage.tsx`: 管理者向けの機能を提供するページコンポーネント。
*   `AIAnalysisView.tsx`: Gemini APIによる分析結果を表示するコンポーネント。
*   `BlockedUsersList.tsx`: ブロックしたユーザーの一覧を表示するコンポーネント。
*   `BottomTabBar.tsx`: アプリケーション下部のナビゲーションバー。
*   `ConfirmationModal.tsx`: ユーザーに確認を求めるモーダルダイアログ。
*   `ErrorBoundary.tsx`: アプリケーションのエラーを捕捉し、フォールバックUIを表示するコンポーネント。
*   `FollowedUsersList.tsx`: フォローしているユーザーの一覧を表示するコンポーネント。
*   `FollowersList.tsx`: フォロワーの一覧を表示するコンポーネント。
*   `HeaderActionsMenu.tsx`: ヘッダー部分のアクションメニュー。
*   `LocationCorrectionModal.tsx`: 位置情報の修正を促すモーダル。
*   `Login.tsx`: ユーザーログイン画面のコンポーネント。
*   `ManualAddRestaurantModal.tsx`: 手動でレストランを追加するためのモーダル。
*   `MapView.tsx`: 地図上にレストランなどを表示するコンポーネント。
*   `MonitoringView.tsx`: アプリケーションの監視情報などを表示するコンポーネント。
*   `NotificationCard.tsx`: 通知を表示するカードコンポーネント。
*   `PendingRequestsList.tsx`: 保留中のリクエスト一覧を表示するコンポーネント。
*   `ReadOnlyBanner.tsx`: 読み取り専用モードであることを示すバナー。
*   `RestaurantCard.tsx`: 個々のレストラン情報を表示するカードコンポーネント。
*   `RestaurantInput.tsx`: レストラン情報を入力するためのフォームコンポーネント。
*   `RestaurantList.tsx`: レストランの一覧を表示するコンポーネント。
*   `SearchResultCard.tsx`: 検索結果の個々の項目を表示するカード。
*   `SearchResultList.tsx`: 検索結果の一覧を表示するコンポーネント。
*   `SettingsPage.tsx`: アプリケーションの設定画面。
*   `ShareModal.tsx`: コンテンツを共有するためのモーダル。
*   `Sidebar.tsx`: サイドバーナビゲーション。
*   `ThemeToggle.tsx`: アプリケーションのテーマ（ライト/ダークモードなど）を切り替えるトグル。
*   `TimelineView.tsx`: タイムライン形式で情報を表示するコンポーネント。
*   `UpdateRestaurantModal.tsx`: レストラン情報を更新するためのモーダル。
*   `UserSearch.tsx`: ユーザーを検索するためのコンポーネント。
*   `icons/`: 各種アイコンコンポーネントが格納されています。

### `hooks/` ディレクトリ

Reactのカスタムフックが格納されています。

*   `useApiUsage.ts`: APIの使用状況を管理・取得するためのカスタムフック。
*   `useLocalStorage.ts`: ブラウザのローカルストレージを扱うためのカスタムフック。

### `netlify/functions/` ディレクトリ

Netlify Functions（サーバーレス関数）が格納されています。これらはフロントエンドから呼び出されるAPIエンドポイントとして機能します。

*   `bulk-register-users.ts`: ユーザーの一括登録を行う関数。
*   `create-user-admin.ts`: 管理者ユーザーを作成する関数。
*   `delete-user-account.ts`: ユーザーアカウントを削除する関数。
*   `gemini-analyze-restaurant.ts`: Gemini APIを使用してレストランを分析する関数。
*   `gemini-recommend.ts`: Gemini APIを使用してレストランを推薦する関数。
*   `gemini-search.ts`: Gemini APIを使用してレストランを検索する関数。
*   `gemini-search.ts_old`: `gemini-search.ts` の旧バージョン（またはバックアップ）。
*   `geocode.ts`: 位置情報をジオコーディング（住所から座標へ変換）する関数。
*   `get-gemini-usage.ts`: Gemini APIの使用状況を取得する関数。
*   `get-netlify-usage.ts`: Netlifyの使用状況を取得する関数。
*   `get-shared-restaurants.ts`: 共有されたレストラン情報を取得する関数。
*   `get-supabase-usage.ts`: Supabaseの使用状況を取得する関数。
*   `hotpepper-area-search.ts`: Hot Pepper APIでエリア検索を行う関数。
*   `hotpepper-genre-master.ts`: Hot Pepper APIでジャンルマスター情報を取得する関数。
*   `hotpepper-search.ts`: Hot Pepper APIでレストラン検索を行う関数。
*   `log-api-usage.ts`: APIの使用ログを記録する関数。
*   `maps-api-key.ts`: Google Maps APIキーを扱う関数（通常は環境変数から取得）。
*   `tsconfig.json`: Netlify Functions用のTypeScriptコンパイラ設定ファイル。

### `services/` ディレクトリ

各種APIやビジネスロジックを扱うサービス層のファイルが格納されています。

*   `blockService.ts`: ユーザーブロック関連のロジック。
*   `followService.ts`: ユーザーフォロー関連のロジック。
*   `geminiService.ts`: Gemini APIとの連携ロジック。
*   `geocodingService.ts`: ジオコーディング関連のロジック。

### `utils/` ディレクトリ

汎用的なユーティリティ関数が格納されています。

*   `textUtils.ts`: テキスト操作に関するユーティリティ関数。

## 4. セットアップと実行方法

1.  **依存関係のインストール:**
    ```bash
    npm install
    ```
2.  **開発サーバーの起動:**
    ```bash
    npm run dev
    ```
    アプリケーションは通常 `http://localhost:5173` で利用可能になります。

3.  **Netlify Functionsのデプロイ (必要に応じて):**
    Netlify CLI を使用してローカルで関数をテストしたり、Netlifyにデプロイしたりできます。

    ```bash
    netlify dev
    ```
