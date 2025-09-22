import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import type { Handler, HandlerEvent } from "@netlify/functions";
import type { Restaurant, ChatMessage } from "../../types";

// log-api-usage関数を呼び出すヘルパー関数
async function logApiUsage(userId: string | undefined, apiType: string, inputTokens?: number, outputTokens?: number) {
  if (!userId) {
    console.warn("User ID is undefined, cannot log API usage.");
    return;
  }
  try {
    await fetch(`${process.env.URL}/.netlify/functions/log-api-usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`, // 認証はユーザーIDを使用
      },
      body: JSON.stringify({ api_type: apiType, input_tokens: inputTokens, output_tokens: outputTokens }),
    });
  } catch (error) {
    console.error("Failed to log API usage:", error);
  }
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "APIキーがサーバーに設定されていません。" }) };
  }

  try {
    const { userQuery, restaurants, history } = JSON.parse(event.body || '{}') as { userQuery: string; restaurants: Restaurant[]; history: ChatMessage[] };
    if (!userQuery || !restaurants || restaurants.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: '質問とレストランリストは必須です。' }) };
    }

    const ai = new GoogleGenerativeAI(API_KEY);

    // To save tokens, we only send essential information to the model
    const simplifiedRestaurants = restaurants.map(r => ({
        id: r.id,
        name: r.name,
        prefecture: r.prefecture,
        city: r.city,
        genres: r.genres,
        visitCount: r.visitCount,
    }));
    
    // Build the conversation history for the prompt
    const conversationHistory = (history || []).map(msg => 
        `### ${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}\n${msg.content}`
    ).join('\n\n');

    const prompt = `
あなたは、ユーモアのセンスにあふれた、少し風変わりな食のコンシェルジュです。
ユーザーのお気に入りレストランリストを元に、過去の会話履歴を考慮しつつ、現在のリクエストに対して最高の体験を約束するお店を最大5つまで選び、その理由を面白おかしく紹介してください。

# 過去の会話履歴
${conversationHistory || "まだ会話はありません。"}

# レストランリスト（あなたの知識ベース）
${JSON.stringify(simplifiedRestaurants, null, 2)}

# ユーザーの現在のリクエスト
"${userQuery}"

# 回答のルール
- **役割（ペルソナ）**: あなたはただの推薦アシスタントではありません。ウィットに富んだコンシェルジュとして、ユーザーを楽しませることを第一に考えてください。
- **推薦理由**: ユーザーが付けたコメント(userComment)はあなたの知識ベースに含まれていません。店の名前、ジャンル、立地、来店回数といった客観的な情報だけを元に、あなたの想像力とユーモアで推薦理由を創作してください。比喩や少し大げさな表現を歓迎します。（例：「〇〇（店名）は、あなたの疲れた心と胃袋を救う、週末の最終避難場所です。」）
- **禁止事項**: ユーザーの個人的なコメントや感想には絶対に言及しないでください。
- **推薦数**: できるだけ多くの選択肢を提示するため、最大5店舗まで推薦してください。
- **形式**: 必ず指定されたJSONスキーマに従って回答してください。回答はJSONオブジェクトそのものである必要があります。
`;

    const responseSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        recommendations: {
          type: SchemaType.ARRAY,
          description: "推薦するレストランのリスト",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING, description: "レストランの一意のID" },
              name: { type: SchemaType.STRING, description: "レストラン名" },
              reason: { type: SchemaType.STRING, description: "このレストランを推薦する具体的な理由" },
            },
            required: ["id", "name", "reason"],
          },
        },
        summary: {
          type: SchemaType.STRING,
          description: "推薦全体に関する総括的なコメント。推薦したお店についても触れる。",
        },
      },
      required: ["recommendations", "summary"],
    };

    const model = ai.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8,
      },
    });
    const result = await model.generateContent(prompt);
    const response = result.response;

    const jsonText = response.text();

    // トークン使用量をログに記録
    const usage = result.response.usageMetadata;
    if (usage) {
      const userId = event.headers['x-netlify-identity-user-id']; // Netlify IdentityからユーザーIDを取得
      await logApiUsage(userId, 'gemini-recommend', usage.promptTokenCount, usage.candidatesTokenCount);
    }
    
    // The model should return a valid JSON object string based on the schema.
    // We pass it directly to the client.
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: jsonText,
    };

  } catch (error) {
    console.error("Error in gemini-recommend function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : "AIによる推薦中に内部エラーが発生しました。" }),
    };
  }
};

export { handler };
