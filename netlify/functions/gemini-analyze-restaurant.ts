import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Handler, HandlerEvent } from "@netlify/functions";
import type { HotpepperRestaurant } from "../../types";

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
    const restaurant = JSON.parse(event.body || '{}') as (HotpepperRestaurant & { userComment?: string; visitCount?: number });
    if (!restaurant.name) {
        return { statusCode: 400, body: JSON.stringify({ error: '店舗情報が不足しています。' }) };
    }

    const ai = new GoogleGenerativeAI(API_KEY);

    const prompt = `
あなたは想像力豊かなグルメブロガーです。以下の情報を持つ飲食店について、読者が「絶対にそこへ行きたい！」と感じるような、パーソナルで魅力的な紹介文を創作してください。

# 店舗情報
- 店名: ${restaurant.name}
- ジャンル: ${restaurant.genre || '情報なし'}
- キャッチコピー: ${restaurant.catch || '情報なし'}
- 住所: ${restaurant.address}

${(restaurant.visitCount !== undefined && restaurant.visitCount > 0) || restaurant.userComment ? `
# あなたの記憶（追加情報）
${restaurant.visitCount !== undefined && restaurant.visitCount > 0 ? `- 来店回数: ${restaurant.visitCount}回` : ''}
${restaurant.userComment ? `- 既存のメモ: "${restaurant.userComment}"` : ''}
` : ''}

# 紹介文の作成指示
- **役割**: あなたはこの店のファンの一人です。個人的な体験や感情を込めて書いてください。
- **シナリオ**: 以下のいずれかのシナリオに沿って、物語を創作してください。
    - 初めてこの店を訪れた時の感動的な体験。
    - 大切な人（友人、恋人、家族）を連れて行った時のエピソード。
    - この店の特定のメニューや雰囲気が、自分の人生のワンシーンとどう結びついているか。
- **表現**: 既存のメモの内容を参考にしつつも、あなたの言葉で表現を豊かにしてください。五感（特に味覚、嗅覚、店内の音など）に訴える描写を必ず含めてください。
- **具体性**: 「美味しい」や「素晴らしい」だけでなく、「〇〇のような食感」「〇〇を彷彿とさせる香り」のように、比喩表現を一つ以上使ってください。
- **形式**: 全体で100〜150字程度の、親しみやすい文章にしてください。回答は紹介文のみとし、他の余計な言葉は含めないでください。
`;

    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { temperature: 0.7 }});
    const result = await model.generateContent(prompt);
    const response = result.response;

    const comment = response.text();

    // トークン使用量をログに記録
    const usage = result.response.usageMetadata;
    if (usage) {
      const userId = event.headers['x-netlify-identity-user-id']; // Netlify IdentityからユーザーIDを取得
      await logApiUsage(userId, 'gemini-analyze-restaurant', usage.promptTokenCount, usage.candidatesTokenCount);
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    };

  } catch (error) {
    console.error("Error in gemini-analyze-restaurant function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : "AIによる分析中に内部エラーが発生しました。" }),
    };
  }
};

export { handler };