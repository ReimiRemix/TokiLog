import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Handler, HandlerEvent } from "@netlify/functions";
import type { HotpepperRestaurant } from "../../types";

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "APIキーがサーバーに設定されていません。" }) };
  }

  try {
    const restaurant = JSON.parse(event.body || '{}') as HotpepperRestaurant;
    if (!restaurant.name) {
        return { statusCode: 400, body: JSON.stringify({ error: '店舗情報が不足しています。' }) };
    }

    const ai = new GoogleGenerativeAI(API_KEY);

    const prompt = `
あなたはプロのグルメレポーターです。以下の情報を持つ飲食店について、ユーザーが「行ってみたい！」と思うような、簡潔で魅力的な紹介文を作成してください。

# 店舗情報
- 店名: ${restaurant.name}
- ジャンル: ${restaurant.genre}
- キャッチコピー: ${restaurant.catch}
- 住所: ${restaurant.address}

# 作成する紹介文のポイント
- どんな料理が楽しめそうか、お店の雰囲気はどうかを想像して記述してください。
- デート、友人との食事、家族での利用、一人での利用など、どんなシーンにおすすめかを具体的に含めてください。
- 全体で100〜150字程度の、親しみやすい文章にしてください。
- 回答は紹介文のみとし、他の余計な言葉は含めないでください。
`;

    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash"});
    const result = await model.generateContent(prompt);
    const response = result.response;

    const comment = response.text();
    
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