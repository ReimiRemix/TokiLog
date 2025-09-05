import { GoogleGenerativeAI, Schema, Part, SchemaType } from "@google/generative-ai";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 600 }); // 10分キャッシュ

interface RestaurantDetails {
  name: string;
  address: string;
  hours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  prefecture: string;
  city: string;
  website?: string | null;
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

interface FetchResult {
  details: RestaurantDetails[];
  sources: Source[];
  warning?: string;
}

/**
 * Extracts a balanced JSON object or array from a string.
 */
function extractJson(text: string, openChar: string, closeChar: string): string | null {
  const startIndex = text.indexOf(openChar);
  if (startIndex === -1) return null;

  let depth = 1;
  let inString = false;
  let isEscaped = false;

  for (let i = startIndex + 1; i < text.length; i++) {
    const char = text[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === '\\') {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
    }
    if (!inString) {
      if (char === openChar) depth++;
      else if (char === closeChar) {
        depth--;
        if (depth === 0) return text.substring(startIndex, i + 1);
      }
    }
  }
  return null;
}

// APIエラーオブジェクトにstatusプロパティが存在するかをチェックする型ガード
interface APIErrorWithStatus {
  status: number;
}

function isAPIErrorWithStatus(error: unknown): error is APIErrorWithStatus {
  return typeof error === 'object' && error !== null && 'status' in error && typeof (error as any).status === 'number';
}

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

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const API_KEY = process.env.GEMINI_PAYG_API_KEY;
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

    // キャッシュチェック
    const cacheKey = JSON.stringify(query);
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      console.log("Gemini Search - Returning cached result for:", cacheKey);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cachedResult),
      };
    }

    const ai = new GoogleGenerativeAI(API_KEY);

    const fullQuery = `${query.prefecture} ${query.city || ""} ${query.small_area_text || ""} ${query.genre_text || ""} ${query.storeName || ""}`.trim();
    console.log("Gemini Search - Full query for prompt:", fullQuery);

    const prompt = `
あなたは、指定されたエリアのレストラン情報に詳しい検索アシスタントです。ユーザーのクエリに基づいて、Google Searchツールを優先的に使用し、必要に応じてあなたの知識を補完的に活用して、最適なレストランをJSON形式で提案してください。ただし、Google Searchが利用できない場合は、あなたの内部知識のみを使用して情報を提供してください。

# 厳守すべきルール
1. **データソースの優先順位**: Google Searchツールが利用可能な場合、それを必須で使用し、検索結果を主要なデータソースとしてください。検索結果に不足する情報（例: 営業時間、緯度、経度、公式サイトURL）は、あなたの知識で補完しても構いません。Google Searchが利用できない場合、あなたの内部知識のみで情報を提供してください。
2. **厳格なエリア制約**: 検索エリアは「${query.prefecture} ${query.city || ''} ${query.small_area_text || ''}」です。このエリア外のレストランは結果に含めないでください。検索結果や内部知識が異なるエリアを示す場合、その情報は無視してください。
3. **正確な情報抽出**: レストランの「名前」「住所」「営業時間」「緯度」「経度」「都道府県」「市区町村」「公式サイトのURL」を、わかる範囲で正確に抽出し、指定されたJSONスキーマ通りに最大50件出力してください。営業時間、緯度、経度、公式サイトURLが不明な場合はnullまたは省略して構いません。
4. **JSON出力の徹底**: あなたの回答は、指定されたJSONスキーマに準拠したJSONオブジェクトのみでなければなりません。説明や他のテキストは一切含めないでください。
5. **結果がない場合**: 条件に合うレストランが見つからなかった場合は、必ずdetailsを空の配列 [] として返してください。
6. **柔軟なクエリ処理**: クエリにジャンル（例: "${query.genre_text || ''}"）が含まれる場合、そのジャンルに合致するレストランを優先してください。店舗名（例: "${query.storeName || ''}"）が指定されている場合、完全一致を優先しつつ、類似の結果も含めてもよいです。

# 実行クエリ
「${fullQuery}」
`;



    // executeSearch関数の戻り値の型をより厳密に指定
    const executeSearch = async (queryText: string, useGoogleSearch: boolean = true): Promise<{ details: RestaurantDetails[]; sources: Source[] }> => {
      const model = ai.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
        },
        // TypeScriptのエラーを回避するため、型アサーション `as any` を使用
        // `@google/generative-ai`のTool型定義に`googleSearch`が直接含まれないため
        tools: useGoogleSearch ? [{ google_search_retrieval: {} } as any] : [],
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt.replace(fullQuery, queryText) } as Part] }],
      });

      // トークン使用量をログに記録
      const usage = result.response.usageMetadata;
      if (usage) {
        const userId = event.headers['x-netlify-identity-user-id']; // Netlify IdentityからユーザーIDを取得
        await logApiUsage(userId, 'gemini-search', usage.promptTokenCount, usage.candidatesTokenCount);
      }

      const responseText = result.response.text();
      console.log("Gemini Search - Raw AI response text:", responseText);

      let parsedResult: { details: RestaurantDetails[]; sources: Source[] }; // 常にdetailsとsourcesを持つことを期待
      // Geminiモデルからの応答が完全なJSONでない場合に備え、extractJsonでJSON部分を抽出
      const jsonStr = extractJson(responseText, '{', '}');
      try {
        parsedResult = jsonStr ? JSON.parse(jsonStr) : { details: [], sources: [] };
        // JSON.parseが成功してもdetailsやsourcesがない場合（スキーマ違反の可能性）に備える
        if (!parsedResult.details) parsedResult.details = [];
        if (!parsedResult.sources) parsedResult.sources = [];
      } catch (e) {
        console.error("Gemini Search - Failed to parse AI response as JSON:", responseText, e);
        parsedResult = { details: [], sources: [] }; // パース失敗時は空の配列を返す
      }
      return parsedResult;
    };

    let parsedResult: { details: RestaurantDetails[]; sources: Source[] };
    let warning: string | undefined;
    let quotaExceededForToday = false; // 新しいフラグを追加

    // Google Searchツールを使用して最初の検索を試みる
    try {
      parsedResult = await executeSearch(fullQuery, true); // 常にGoogle Searchツールを有効にして最初の試行
    } catch (error: unknown) { // errorの型をunknownに変更し、型ガードを使用
      if (isAPIErrorWithStatus(error) && error.status === 429) {
        console.log("Gemini Search - Quota exceeded for generateContent requests. Cannot perform any more API calls today.");
        quotaExceededForToday = true;
        // APIを再呼び出しせずに、警告メッセージを設定し、空の結果で続行
        warning = "本日のAPI利用制限（1日50リクエスト）に達しました。明日改めてお試しいただくか、Pay-As-You-Goプランへの移行をご検討ください。現在表示される情報はAIの内部知識に基づくもので、正確性や最新性が保証されない場合があります。詳細: https://ai.google.dev/gemini-api/docs/rate-limits";
        parsedResult = { details: [], sources: [] };
      } else {
        // 429以外のエラーはそのままスロー
        throw error;
      }
    }

    let details = parsedResult.details || [];
    let sources = parsedResult.sources || [];

    // クォータが超過しておらず、かつ最初の検索で結果が空だった場合のみ、緩和クエリで再検索を試みる
    if (!quotaExceededForToday && details.length === 0 && (query.small_area_text || query.storeName)) {
      console.log("Gemini Search - No results found, retrying with relaxed query...");
      const relaxedQuery = `${query.prefecture} ${query.city || ""} ${query.genre_text || ""}`.trim();
      try {
        // 緩和クエリでもGoogle Searchツールを有効にして試行
        parsedResult = await executeSearch(relaxedQuery, true);
        details = parsedResult.details || [];
        sources = parsedResult.sources || [];
        totalInputTokens += parsedResult.inputTokens;
        totalOutputTokens += parsedResult.outputTokens;
      } catch (error: unknown) { // errorの型をunknownに変更し、型ガードを使用
        if (isAPIErrorWithStatus(error) && error.status === 429) {
          console.log("Gemini Search - Quota exceeded for generateContent requests on relaxed query. Cannot perform any more API calls today.");
          quotaExceededForToday = true; // 再度クォータ超過フラグを立てる
          // APIを再呼び出しせずに、警告メッセージを設定し、空の結果で続行
          warning = "本日のAPI利用制限（1日50リクエスト）に達しました。明日改めてお試しいただくか、Pay-As-You-Goプランへの移行をご検討ください。現在表示される情報はAIの内部知識に基づくもので、正確性や最新性が保証されない場合があります。詳細: https://ai.google.dev/gemini-api/docs/rate-limits";
          parsedResult = { details: [], sources: [] };
          details = []; // 念のため空に設定
          sources = []; // 念のため空に設定
        } else {
          throw error;
        }
      }
    }

    // エリア制約を再確認 (クォータ超過で空になった場合でも問題なくフィルタリングされる)
    details = details.filter((detail) => {
      const isValidPrefecture = detail.prefecture === query.prefecture;
      const isValidCity = !query.city || detail.city === query.city;
      // 小エリアテキストが指定されている場合、住所にそのテキストが含まれているかを確認
      const isValidSmallArea = !query.small_area_text || (detail.address && detail.address.includes(query.small_area_text));
      return isValidPrefecture && isValidCity && isValidSmallArea;
    });

    const finalResult: FetchResult = {
      details,
      // ソース情報をユニーク化 (重複するURIを排除)
      sources: [...new Set(sources.map(s => JSON.stringify(s)))].map(s => JSON.parse(s)),
      ...(warning && { warning }), // warningがある場合のみ結果に含める
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    };

    // キャッシュに保存
    cache.set(cacheKey, finalResult);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalResult),
    };
  } catch (error: unknown) { // 最上位のcatchブロックもunknownに変更
    console.error("Error in gemini-search function:", error);
    // 予期せぬ、または捕捉しきれなかったエラーの場合の最終的なハンドリング
    let errorMessage = "AIによる検索中に内部エラーが発生しました。";
    if (isAPIErrorWithStatus(error) && error.status === 429) {
      errorMessage = "APIの利用制限（1日50リクエスト）に達しました。Pay-As-You-Goプランへの移行を検討してください。詳細: https://ai.google.dev/gemini-api/docs/rate-limits";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};

export { handler };