import type { Handler, HandlerEvent } from "@netlify/functions";

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const API_KEY = process.env.HOTPEPPER_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "ホットペッパーAPIキーがサーバーに設定されていません。" }) };
  }

  const largeAreaCode = event.queryStringParameters?.large_area_code;
  if (!largeAreaCode) {
    return { statusCode: 400, body: JSON.stringify({ error: 'large_area_code is required' }) };
  }

  const params = new URLSearchParams({
    key: API_KEY,
    format: 'json',
    large_area: largeAreaCode,
  });

  const url = `http://webservice.recruit.co.jp/hotpepper/middle_area/v1/?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ホットペッパーAPIへのリクエストに失敗しました: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.results.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data.results.error[0].message }),
      };
    }

    const middleAreas = data.results.middle_area.map((area: any) => ({
      code: area.code,
      name: area.name,
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(middleAreas),
    };
  } catch (error) {
    console.error("Error in hotpepper-area-search function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : "エリア情報の取得中にエラーが発生しました。" }),
    };
  }
};

export { handler };
