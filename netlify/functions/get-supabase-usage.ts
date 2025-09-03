import type { Handler } from "@netlify/functions";

const handler: Handler = async (event, context) => {
  console.log("get-supabase-usage function invoked.");
  const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
  const PROJECT_ID = process.env.SUPABASE_PROJECT_ID;

  if (!SUPABASE_ACCESS_TOKEN || !PROJECT_ID) {
    console.error("Supabase access token or project ID not configured.");
    console.log(`SUPABASE_ACCESS_TOKEN present: ${!!SUPABASE_ACCESS_TOKEN}`);
    console.log(`SUPABASE_PROJECT_ID present: ${!!PROJECT_ID}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Supabase access token or project ID not configured." }),
    };
  }

  const url = `https://api.supabase.com/v1/projects/${PROJECT_ID}/usage`;
  console.log("Requesting Supabase URL:", url);

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`Supabase API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch Supabase usage data. Details:", errorText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Failed to fetch Supabase usage.", details: errorText }),
      };
    }

    const data = await response.json();
    console.log("Successfully fetched Supabase usage data:", data);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error: any) {
    console.error("An error occurred in get-supabase-usage:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal server error." }),
    };
  }
};

export { handler };
