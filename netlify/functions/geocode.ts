import type { Handler, HandlerEvent } from "@netlify/functions";

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Use the Google Maps API key, not the Gemini API key
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "Google Maps APIキーがサーバーに設定されていません。" }) };
  }

  try {
    const { address } = JSON.parse(event.body || '{}');
    if (!address) {
      return { statusCode: 400, body: JSON.stringify({ error: '住所は必須です。' }) };
    }
    
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${API_KEY}&language=ja`;
    
    const response = await fetch(url);
    if (!response.ok) {
      // This handles network errors, etc., before we even get a JSON response from Google.
      throw new Error(`Google Maps APIへのリクエストに失敗しました: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error("Geocoding API Error:", data.status, data.error_message);
      
      let userFacingError;
      switch(data.status) {
        case 'ZERO_RESULTS':
          userFacingError = '指定された住所が見つかりませんでした。入力内容を確認してください。';
          break;
        case 'REQUEST_DENIED':
          userFacingError = 'ジオコーディングのリクエストが拒否されました。APIキーにGeocoding APIの権限が付与されているか、またはキーの利用制限（リファラ制限など）をご確認ください。';
          break;
        case 'OVER_QUERY_LIMIT':
          userFacingError = 'APIの利用上限に達しました。しばらくしてからもう一度お試しください。';
          break;
        case 'INVALID_REQUEST':
            userFacingError = '無効なリクエストです。入力された住所に問題がある可能性があります。';
            break;
        default:
          userFacingError = `座標を取得できませんでした。(${data.status})`;
      }
      
      throw new Error(userFacingError);
    }

    if (!data.results || data.results.length === 0) {
      // This case is generally covered by ZERO_RESULTS, but serves as a robust fallback.
      throw new Error('指定された住所が見つかりませんでした。入力内容を確認してください。');
    }

    const location = data.results[0].geometry.location;
    // The frontend expects latitude and longitude keys
    const coords = {
      latitude: location.lat,
      longitude: location.lng
    };
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coords),
    };

  } catch (error) {
    console.error("Error in geocode function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : "ジオコーディング中に内部エラーが発生しました。" }),
    };
  }
};

export { handler };