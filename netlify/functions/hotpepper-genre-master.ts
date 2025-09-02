import type { Handler } from "@netlify/functions";

const handler: Handler = async (event, context) => {
  const API_KEY = process.env.HOTPEPPER_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "ホットペッパーAPIキーがサーバーに設定されていません。" }) };
  }

  const params = new URLSearchParams({
    key: API_KEY,
    format: 'json',
  });

  const url = `http://webservice.recruit.co.jp/hotpepper/genre/v1/?${params.toString()}`;

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

    const genres = data.results.genre.map((genre: any) => ({
      code: genre.code,
      name: genre.name,
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(genres),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "ジャンル情報の取得中にエラーが発生しました。" }),
    };
  }
};

export { handler };
