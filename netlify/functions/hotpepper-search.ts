
import type { Handler, HandlerEvent } from "@netlify/functions";
import type { HotpepperRestaurant, SearchQuery } from "../../types";

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

    // Combine all available fields into a single keyword.
    // This provides a more flexible search, similar to the Hotpepper website.
    const keywordString = [query.prefecture, query.city, query.storeName]
      .filter(Boolean)
      .join(' ');

    if (keywordString) {
      params.append('keyword', keywordString);
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: '検索キーワードがありません。' }) };
    }
    
    const url = `https://webservice.recruit.co.jp/hotpepper/shop/v1/?${params.toString()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ホットペッパーAPIへのリクエストに失敗しました: ${response.statusText}`);
    }

    const data = await response.json();

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
