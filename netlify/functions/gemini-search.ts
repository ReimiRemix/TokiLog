import { GoogleGenerativeAI, Schema, Part, SchemaType } from "@google/generative-ai";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface RestaurantDetails {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  prefecture: string;
  city: string;
  website?: string;
}

interface Source {
  uri: string;
  title: string;
}

interface SearchQuery {
  prefecture: string;
  city?: string;
  small_area_text?: string;
  genre_text?: string;
  storeName?: string;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "APIキーがサーバーに設定されていません。" }),
    };
  }

  try {
    const query = JSON.parse(event.body || "{}") as SearchQuery;
    console.log("Gemini Search - Incoming query:", query);

    if (!query.prefecture) {
      console.error("Gemini Search - Missing prefecture in query:", query);
      return { statusCode: 400, body: JSON.stringify({ error: "都道府県は必須です。" }) };
    }

    const ai = new GoogleGenerativeAI(API_KEY);

    const fullQuery = `${query.prefecture} ${query.city || ""} ${query.small_area_text || ""} ${query.genre_text || ""} ${query.storeName || ""}`.trim();
    console.log("Gemini Search - Full query for prompt:", fullQuery);

    const prompt = `
あなたは、指定されたエリアのレストラン情報に詳しい検索アシスタントです。ユーザーのクエリに基づいて、あなたの知識から最適なレストランをJSON形式で提案してください。

# 厳守すべきルール
1. **知識の活用**: あなたが持つ知識を最大限に活用して、クエリに最も一致するレストランを提案してください。
2. **実在する情報のみ**: **情報を創作することは絶対に禁止します。** あなたの知識ベースに存在する、実在のレストランの情報のみを提供してください。もしクエリに合致する実在のレストランがなければ、結果は空にしてください。
3. **厳格なエリア制約**: 検索エリアは「${query.prefecture} ${query.small_area_text || query.city || ''}」です。このエリア外のレストランは結果に含めないでください。
4. **正確な情報抽出**: レストランの「名前」「住所」「緯度」「経度」「都道府県」「市区町村」「公式サイトのURL」を、わかる範囲で正確に抽出し、指定されたJSONスキーマ通りに最大50件出力してください。緯度・経度が不明な場合は省略して構いません。
5. **JSON出力の徹底**: あなたの回答は、指定されたJSONスキーマに準拠したJSONオブジェクトのみでなければなりません。説明や他のテキストは一切含めないでください。
6. **結果がない場合**: 条件に合うレストランが見つからなかった場合は、必ずdetailsを空の配列 [] として返してください。

# 実行クエリ
「${fullQuery}」
`;

    const responseSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        details: {
          type: SchemaType.ARRAY,
          description: "検索結果のレストランリスト",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING, description: "レストラン名" },
              address: { type: SchemaType.STRING, description: "住所" },
              latitude: { type: SchemaType.NUMBER, description: "緯度" },
              longitude: { type: SchemaType.NUMBER, description: "経度" },
              prefecture: { type: SchemaType.STRING, description: "都道府県" },
              city: { type: SchemaType.STRING, description: "市区町村" },
              website: { type: SchemaType.STRING, description: "公式サイトURL" },
            },
            required: ["name", "address", "prefecture", "city"],
          },
        },
        sources: {
          type: SchemaType.ARRAY,
          description: "情報源となったウェブサイトのリスト",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              uri: { type: SchemaType.STRING, description: "ウェブサイトのURL" },
              title: { type: SchemaType.STRING, description: "ウェブサイトのタイトル" },
            },
            required: ["uri", "title"],
          },
        },
      },
      required: ["details", "sources"],
    };

    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      },
      // tools: [new GoogleSearchTool()], // GoogleSearchTool はインポートできないため削除
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt } as Part] }],
    });

    const responseText = result.response.text(); // response.text は関数
    console.log("Gemini Search - Raw AI response text:", responseText);

    let parsedResult: { details?: RestaurantDetails[]; sources?: Source[] };
    try {
      parsedResult = JSON.parse(responseText);
    } catch (e) {
      console.error("Gemini Search - Failed to parse AI response as JSON:", responseText, e);
      parsedResult = { details: [], sources: [] }; // Fallback to empty
    }

    const finalResult = {
      details: parsedResult.details || [],
      sources: parsedResult.sources || [],
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
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
