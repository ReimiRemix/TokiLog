
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const { NETLIFY_API_KEY, NETLIFY_ACCOUNT_SLUG } = process.env;

  if (!NETLIFY_API_KEY || !NETLIFY_ACCOUNT_SLUG) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Netlify API key or account slug not configured." }),
    };
  }

  const url = `https://api.netlify.com/api/v1/accounts/${NETLIFY_ACCOUNT_SLUG}/bandwidth`;

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${NETLIFY_API_KEY}`,
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Failed to fetch Netlify usage data.", details: await response.text() }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
