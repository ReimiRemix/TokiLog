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
あなたはプロのグルメレポーターです。以下の情報を持つ飲食店について、ユーザーが「行ってみたい！」と思うような、簡潔で魅力的な紹介文を作成してください。

# 店舗情報
- 店名: ${restaurant.name}
- ジャンル: ${restaurant.genre || '情報なし'}
- キャッチコピー: ${restaurant.catch || '情報なし'}
- 住所: ${restaurant.address}

${(restaurant.visitCount !== undefined && restaurant.visitCount > 0) || restaurant.userComment ? `
# 追加情報
${restaurant.visitCount !== undefined && restaurant.visitCount > 0 ? `- 来店回数: ${restaurant.visitCount}回` : ''}
${restaurant.userComment ? `- 既存のコメント: "${restaurant.userComment}"` : ''}
` : ''}

# 作成する紹介文のポイント
- どんな料理が楽しめそうか、お店の雰囲気はどうかを想像して記述してください。
- デート、友人との食事、家族での利用、一人での利用など、どんなシーンにおすすめかを具体的に含めてください。
${(restaurant.visitCount !== undefined && restaurant.visitCount > 0) || restaurant.userComment ? `
- **重要**: 上記の「追加情報」を必ず考慮してください。
  - 既存のコメントがある場合は、その内容や意図を汲み取り、より洗練させたり、情報を補足する形で文章を作成してください。全く新しい内容にするのではなく、元のコメントを活かすことを重視してください。
  - 来店回数が1回以上の場合は、リピーターであることがわかるような「また来た」「お気に入りの」といったニュアンスを含めると、よりパーソナルな紹介文になります。
` : ''}
- 全体で100〜150字程度の、親しみやすい文章にしてください。
- 回答は紹介文のみとし、他の余計な言葉は含めないでください。
`;

    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash"});
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