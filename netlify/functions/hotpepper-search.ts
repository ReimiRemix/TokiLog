import type { Handler, HandlerEvent } from "@netlify/functions";
import type { HotpepperRestaurant, SearchQuery } from "../../types";
const { GoogleGenAI } = require("@google/genai");

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const HOTPEPPER_API_KEY = process.env.HOTPEPPER_API_KEY;
  if (!HOTPEPPER_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "ホットペッパーAPIキーがサーバーに設定されていません。" }) };
  }

  try {
    const query = JSON.parse(event.body || '{}') as SearchQuery;
    console.log("Hotpepper Search - Incoming query:", query);

    if (!query.prefecture) {
      console.error("Hotpepper Search - Missing prefecture in query:", query);
      return { statusCode: 400, body: JSON.stringify({ error: '都道府県は必須です。' }) };
    }
    
    const buildParams = (q: SearchQuery) => {
        const params = new URLSearchParams({
            key: HOTPEPPER_API_KEY,
            format: 'json',
            count: '30'
        });
        if (q.genre) params.append('genre', q.genre);
        if (q.small_area_code) {
            params.append('small_area', q.small_area_code);
        } else if (q.prefecture_code) {
            params.append('pref', q.prefecture_code);
        }

        let keywords: string[] = [];
        if (q.storeName) keywords.push(q.storeName);
        if (q.genre_text) keywords.push(q.genre_text);
        if (q.small_area_text) keywords.push(q.small_area_text);

        if (keywords.length > 0) {
            params.append('keyword', keywords.join(' '));
        }
        return params;
    };

    let requestParams = buildParams(query);

    // Check if a keyword or area is specified, otherwise return an error
    if (!requestParams.has('keyword') && !requestParams.has('small_area') && !requestParams.has('pref')) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: '検索キーワード、ジャンル、市区町村のいずれかを指定してください。' }),
        };
    }

    let url = `http://webservice.recruit.co.jp/hotpepper/gourmet/v1/?${requestParams.toString()}`;
    
    let response = await fetch(url);
    let data = await response.json();

    if (data.results.error && data.results.error[0]?.code === 3000) {
        console.log("Hotpepper API error 3000: Condition too broad. Attempting AI optimization.");
        const GEMINI_API_KEY = process.env.API_KEY;
        if (GEMINI_API_KEY) {
            try {
                const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
                const model = ai.getGenerativeModel({ model: "gemini-pro" });

                const prompt = `
あなたはホットペッパーAPIの検索エキスパートです。
以下の検索クエリで「検索範囲が広すぎる」というエラーが発生しました。
このエラーを回避し、ユーザーの意図を汲んだ上で、より具体的な検索条件をJSON形式で提案してください。

# 元の検索クエリ
${JSON.stringify(query, null, 2)}

# 提案のルール
- 
`small_area_code`が指定されていない場合、`prefecture_code` (${query.prefecture_code}) に関連する人気のエリアや中心的なエリアの`small_area_code`を1つ提案してください。
- `keyword`が「レストラン」のような一般的な単語の場合は、より具体的なジャンルや料理名を`keyword`として提案してください。（例：「イタリアン」「ラーメン」など）
- `genre`を追加または変更することも有効です。
- 回答はJSONオブジェクトのみとし、説明やマークダウンは含めないでください。
- 元のクエリに含まれる`prefecture`, `prefecture_code`, `storeName`は変更しないでください。

# 出力形式 (JSON)
{
  "small_area_code": "<提案する小エリアコード>",
  "genre": "<提案するジャンルコード>",
  "keyword": "<提案するキーワード>"
}
`;

                const result = await model.generateContent(prompt);
                const aiResponse = result.response;
                const text = aiResponse.text().replace(/```json|```/g, '').trim();
                const optimizedSuggestion = JSON.parse(text);

                console.log("AI suggestion:", optimizedSuggestion);

                const newQuery = { ...query, ...optimizedSuggestion };
                requestParams = buildParams(newQuery);
                url = `http://webservice.recruit.co.jp/hotpepper/gourmet/v1/?${requestParams.toString()}`;
                
                console.log("Retrying with new URL:", url);
                response = await fetch(url);
                data = await response.json();

            } catch (e) {
                console.error("AI optimization failed:", e);
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: "検索範囲が広すぎます。AIによる条件絞り込みにも失敗しました。エリアやキーワードをより具体的に指定してください。" }),
                };
            }
        }
    }

    if (data.results.error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: data.results.error[0].message || "ホットペッパーAPIでエラーが発生しました。" })
        }
    }

    const filteredShops = (data.results.shop || []).filter((shop: any) => 
        shop.address && shop.address.includes(query.prefecture)
    );
    
    const formattedResults: HotpepperRestaurant[] = filteredShops.map((shop: any) => {
        const city = shop.middle_area?.name || '不明';
        return {
            id: shop.id, name: shop.name, address: shop.address, hours: shop.open,
            latitude: shop.lat, longitude: shop.lng, prefecture: query.prefecture, city,
            genre: shop.genre?.name || 'ジャンルなし', catch: shop.catch || '',
            photoUrl: shop.photo?.pc?.l || 'https://via.placeholder.com/300',
            siteUrl: shop.urls?.pc || '', isFromHotpepper: true,
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
