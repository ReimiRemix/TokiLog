import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import type { Handler, HandlerEvent } from "@netlify/functions";
import type { Restaurant, ChatMessage } from "../../types";

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
        userComment: r.userComment,
        visitCount: r.visitCount,
    }));
    
    // Build the conversation history for the prompt
    const conversationHistory = (history || []).map(msg => 
        `### ${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}\n${msg.content}`
    ).join('\n\n');

    const prompt = `
あなたはユーザーのお気に入りレストランリストを熟知した、優秀なレストラン推薦アシスタントです。
提供されたレストランリストと過去の会話履歴を参考に、ユーザーの現在の質問に最も合致するお店を最大3つまで選び、その理由を具体的に説明してください。

# 過去の会話履歴
${conversationHistory || "まだ会話はありません。"}

# レストランリスト
${JSON.stringify(simplifiedRestaurants, null, 2)}

# ユーザーの現在の質問
"${userQuery}"

# 回答のルール
- レストランリストの中から、質問の意図に最も沿ったお店を選んでください。（例：「おしゃれ」という言葉があればジャンルやユーザーコメントから推測する、「団体」という言葉があれば居酒屋などを優先するなど）
- 過去の会話の流れを考慮し、文脈に合った回答をしてください。
- なぜそのお店を推薦するのか、具体的な理由を「genres」や「userComment」の内容を引用しながら説明してください。
- 推薦するお店が見つからない場合は、recommendationsを空の配列 \
[]\
 にし、summaryでその旨を伝えてください。
- 必ず指定されたJSONスキーマに従って回答してください。回答はJSONオブジェクトそのものである必要があります。
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
      },
    });
    const result = await model.generateContent(prompt);
    const response = result.response;

    const jsonText = response.text();
    
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
