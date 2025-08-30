import type { Handler } from "@netlify/functions";

const handler: Handler = async () => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Google Maps APIキーがサーバーに設定されていません。" }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  };
};

export { handler };
