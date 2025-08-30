
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
    if (!query.prefecture || !query.storeName) {
      return { statusCode: 400, body: JSON.stringify({ error: '都道府県と店舗名・キーワードは必須です。' }) };
    }
    
    const params = new URLSearchParams({
        key: API_KEY,
        format: 'json',
        count: '20' // Get up to 20 results
    });

    // Use `name_any` for a more precise name search (partial match allowed)
    params.append('name_any', query.storeName);

    // Use `keyword` for location context to narrow down results
    const locationKeyword = `${query.prefecture} ${query.city || ''}`.trim();
    if (locationKeyword) {
        params.append('keyword', locationKeyword);
    }
    
    const url = `https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?${params.toString()}`;
    
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
    
    const formattedResults: HotpepperRestaurant[] = (data.results.shop || []).map((shop: any) => {
        const address = (shop.address || '').trim();
        // If prefecture cannot be parsed from address string, assign a value that will fail the filter.
        const prefectureMatch = address.match(/^(\S+[都道府県])/);
        const prefecture = prefectureMatch ? prefectureMatch[1] : 'PARSE_ERROR';
        
        const cityMatch = address.replace(prefecture, '').match(/^\s*(\S+[市区町村])/);
        const city = cityMatch ? cityMatch[1] : query.city || '不明';

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

    // Filter results to strictly match the requested prefecture.
    // This will discard any results where the address did not contain a matching prefecture.
    // const filteredResults = formattedResults.filter(shop => shop.prefecture === query.prefecture);
    
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
