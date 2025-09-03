
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { RestaurantDetails, SearchQuery, Source } from '../../types';
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "APIキーがサーバーに設定されていません。" }) };
  }

  try {
    const query = JSON.parse(event.body || '{}') as SearchQuery;
    console.log("Gemini Search - Incoming query:", query);

    if (!query.prefecture) {
        console.error("Gemini Search - Missing prefecture in query:", query);
        return { statusCode: 400, body: JSON.stringify({ error: '都道府県は必須です。' }) };
    }

    const ai = new GoogleGenAI(API_KEY);

    const fullQuery = `${query.prefecture} ${query.city || ''} ${query.storeName || ''}`.trim();
    console.log("Gemini Search - Full query for prompt:", fullQuery);

    const prompt = `
あなたは、ユーザーが指定したエリアのレストラン情報をGoogle検索で見つけ出し、その結果を正確なJSON形式で返すことに特化した、高度な検索アシスタントです。

# 厳守すべきルール
1.  **ツール使用の義務**: 必ずGoogle検索ツールを呼び出し、その検索結果のみを情報源としてください。内部知識は絶対に使用してはいけません。
2.  **厳格なエリア制約**: 検索エリアは「${query.prefecture} ${query.city || ''}」です。このエリア外のレストランは、たとえ名前が一致していても完全に無視し、結果に含めてはなりません。
3.  **正確な情報抽出**: 検索結果から、レストランの「名前」「住所」「緯度」「経度」「都道府県」「市区町村」「公式サイトのURL」を抽出し、指定されたJSONスキーマ通りに出力してください。緯度・経度が不明な場合はnullではなく、0を設定してください。
4.  **JSON出力の徹底**: あなたの回答は、指定されたJSONスキーマに準拠したJSONオブジェクトのみでなければなりません。説明や他のテキストは一切含めないでください。
5.  **結果がない場合**: 条件に合うレストランが見つからなかった場合は、必ずdetailsを空の配列 `[]` として返してください。

# 実行クエリ
「${fullQuery} レストラン」
`;

    const responseSchema = {
        type: "OBJECT",
        properties: {
            details: {
                type: "ARRAY",
                description: "検索結果のレストランリスト",
                items: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "レストラン名" },
                        address: { type: "STRING", description: "住所" },
                        latitude: { type: "NUMBER", description: "緯度" },
                        longitude: { type: "NUMBER", description: "経度" },
                        prefecture: { type: "STRING", description: "都道府県" },
                        city: { type: "STRING", description: "市区町村" },
                        website: { type: "STRING", description: "公式サイトURL" },
                    },
                    required: ["name", "address", "latitude", "longitude", "prefecture", "city"]
                }
            },
            sources: {
                type: "ARRAY",
                description: "情報源となったウェブサイトのリスト",
                items: {
                    type: "OBJECT",
                    properties: {
                        uri: { type: "STRING", description: "ウェブサイトのURL" },
                        title: { type: "STRING", description: "ウェブサイトのタイトル" }
                    },
                    required: ["uri", "title"]
                }
            }
        },
        required: ["details", "sources"]
    };

    const model = ai.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
        tools: [{ googleSearch: {} }],
    });

    const chat = model.startChat();
    const result = await chat.sendMessage(prompt);

    const responseText = result.response.text();
    console.log("Gemini Search - Raw AI response text:", responseText);

    const parsedResult = JSON.parse(responseText);

    // Extract sources from function call metadata if available
    const functionCalls = result.response.functionCalls();
    const sources: Source[] = [];
    if (functionCalls) {
        // Simplified source extraction, assuming googleSearch might be called multiple times
        // This part might need adjustment based on actual API response structure for tool calls
    }

    // Ensure the final object has the correct structure, even if AI misses `sources`
    const finalResult = {
        details: parsedResult.details || [],
        sources: parsedResult.sources || sources,
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalResult),
    };

  } catch (error) {
    console.error("Error in gemini-search function:", error);
    const errorMessage = error instanceof Error ? error.message : "AIによるWeb検索中に内部エラーが発生しました。";
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};

export { handler };
