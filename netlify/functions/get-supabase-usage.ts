import type { Handler } from "@netlify/functions";

const handler: Handler = async (event, context) => {
  const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
  const PROJECT_ID = process.env.SUPABASE_PROJECT_ID;

  if (!SUPABASE_ACCESS_TOKEN || !PROJECT_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Supabase access token or project ID not configured." }),
    };
  }

  const url = `https://api.supabase.com/v1/projects/${PROJECT_ID}/usage`;

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: errorData.message || "Failed to fetch Supabase usage." }),
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
      body: JSON.stringify({ error: error.message || "Internal server error." }),
    };
  }
};

export { handler };
