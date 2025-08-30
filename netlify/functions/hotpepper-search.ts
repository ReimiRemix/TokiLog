
import type { Handler, HandlerEvent } from "@netlify/functions";
import type { HotpepperRestaurant, SearchQuery } from "../../types";
import { toKatakana } from "../../utils/textUtils";

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const API_KEY = process.env.HOTPEPPER_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "ホットペッパーAPIキーがサーバーに設定されていません。" }) };
  }

  try {
    const query = JSON.parse(event.body || '{}') as SearchQuery;
    console.log("Hotpepper Search - Incoming query:", query);

    if (!query.prefecture) {
      console.error("Hotpepper Search - Missing prefecture in query:", query);
      return { statusCode: 400, body: JSON.stringify({ error: '都道府県は必須です。' }) };
    }
    
    const params = new URLSearchParams({
        key: API_KEY,
        format: 'json',
        count: '30' // Increase count to get more results to filter from
    });

    const prefectureToLargeAreaCode: { [key: string]: string } = {
      '北海道': 'Z01', '青森県': 'Z02', '岩手県': 'Z02', '宮城県': 'Z02', '秋田県': 'Z02', '山形県': 'Z02', '福島県': 'Z02',
      '茨城県': 'Z03', '栃木県': 'Z03', '群馬県': 'Z03', '埼玉県': 'Z03', '千葉県': 'Z03', '東京都': 'Z03', '神奈川県': 'Z03',
      '新潟県': 'Z04', '富山県': 'Z04', '石川県': 'Z04', '福井県': 'Z04',
      '山梨県': 'Z05', '長野県': 'Z05',
      '岐阜県': 'Z06', '静岡県': 'Z06', '愛知県': 'Z06', '三重県': 'Z06',
      '滋賀県': 'Z07', '京都府': 'Z07', '大阪府': 'Z07', '兵庫県': 'Z07', '奈良県': 'Z07', '和歌山県': 'Z07',
      '鳥取県': 'Z08', '島根県': 'Z08', '岡山県': 'Z08', '広島県': 'Z08', '山口県': 'Z08',
      '徳島県': 'Z09', '香川県': 'Z09', '愛媛県': 'Z09', '高知県': 'Z09',
      '福岡県': 'Z10', '佐賀県': 'Z10', '長崎県': 'Z10', '熊本県': 'Z10', '大分県': 'Z10', '宮崎県': 'Z10', '鹿児島県': 'Z10',
      '沖縄県': 'Z11',
    };

    const largeAreaCode = prefectureToLargeAreaCode[query.prefecture];
    if (largeAreaCode) {
      params.append('large_area', largeAreaCode);
    }

    const storeNameProcessed = query.storeName ? toKatakana(query.storeName) : '';

    // For the keyword, use the more specific city and store name.
    const keywordString = [query.city, storeNameProcessed]
      .filter(Boolean)
      .join(' ');

    // If the user provides a specific keyword, use it.
    // Otherwise, use a generic term "レストラン" for a broad search within the prefecture.
    // This avoids the API error from using the prefecture name as the keyword.
    if (keywordString) {
      params.append('keyword', keywordString);
    } else {
      params.append('keyword', 'レストラン'); // Generic fallback keyword
    }
    
    const url = `https://webservice.recruit.co.jp/hotpepper/shop/v1/?${params.toString()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      // This handles network-level errors.
      throw new Error(`ホットペッパーAPIへのリクエストに失敗しました: ${response.statusText}`);
    }

    const data = await response.json();

    // This handles API-level errors, like the "condition too broad" error.
    if (data.results.error && data.results.error[0]?.code === 3000) {
        return {
            statusCode: 400, // Bad Request
            body: JSON.stringify({ error: "検索範囲が広すぎます。市区町村を指定するか、より具体的なキーワードで検索してください。" }),
        };
    }

    if (!data.results || data.results.results_available === 0) {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([]),
        };
    }

    // Post-filter the results to ensure they are in the correct prefecture.
    const filteredShops = (data.results.shop || []).filter((shop: any) => 
        shop.address && shop.address.includes(query.prefecture)
    );
    
    const formattedResults: HotpepperRestaurant[] = filteredShops.map((shop: any) => {
        const prefecture = query.prefecture;
        const city = shop.service_area?.name || query.city || '不明';

        return {
            id: shop.id,
            name: shop.name,
            address: shop.address,
            hours: shop.open,
            latitude: shop.lat,
            longitude: shop.lng,
            prefecture,
            city,
            genre: shop.genre?.name || 'ジャンルなし',
            catch: shop.catch || '',
            photoUrl: shop.photo?.pc?.l || 'https://via.placeholder.com/300',
            siteUrl: shop.urls?.pc || '',
            isFromHotpepper: true,
        };
    });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedResults),
    };

  } catch (error) {
    console.error("Error in hotpepper-search function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : "ホットペッパーAPIでの検索中に内部エラーが発生しました。" }),
    };
  }
};

export { handler };
