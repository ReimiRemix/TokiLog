
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
        count: '20' // Get up to 20 results
    });
    console.log("Hotpepper Search - Initial params:", params.toString());

    // Combine storeName and location for a general keyword search
    const prefectureToLargeAreaCode: { [key: string]: string } = {
      '北海道': 'Z01',
      '青森県': 'Z02',
      '岩手県': 'Z02',
      '宮城県': 'Z02',
      '秋田県': 'Z02',
      '山形県': 'Z02',
      '福島県': 'Z02',
      '茨城県': 'Z03',
      '栃木県': 'Z03',
      '群馬県': 'Z03',
      '埼玉県': 'Z03',
      '千葉県': 'Z03',
      '東京都': 'Z03',
      '神奈川県': 'Z03',
      '新潟県': 'Z04',
      '富山県': 'Z04',
      '石川県': 'Z04',
      '福井県': 'Z04',
      '山梨県': 'Z05',
      '長野県': 'Z05',
      '岐阜県': 'Z06',
      '静岡県': 'Z06',
      '愛知県': 'Z06',
      '三重県': 'Z06',
      '滋賀県': 'Z07',
      '京都府': 'Z07',
      '大阪府': 'Z07',
      '兵庫県': 'Z07',
      '奈良県': 'Z07',
      '和歌山県': 'Z07',
      '鳥取県': 'Z08',
      '島根県': 'Z08',
      '岡山県': 'Z08',
      '広島県': 'Z08',
      '山口県': 'Z08',
      '徳島県': 'Z09',
      '香川県': 'Z09',
      '愛媛県': 'Z09',
      '高知県': 'Z09',
      '福岡県': 'Z10',
      '佐賀県': 'Z10',
      '長崎県': 'Z10',
      '熊本県': 'Z10',
      '大分県': 'Z10',
      '宮崎県': 'Z10',
      '鹿児島県': 'Z10',
      '沖縄県': 'Z11',
    };

    const largeAreaCode = prefectureToLargeAreaCode[query.prefecture];
    if (largeAreaCode) {
      params.append('large_area', largeAreaCode);
    }

    // Use 'address' for city and 'name_any' for the store name for better accuracy
    if (query.city) {
      params.append('address', query.city);
    }
    if (query.storeName) {
      params.append('name_any', query.storeName);
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
