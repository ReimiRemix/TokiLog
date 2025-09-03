import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const handler: Handler = async (event, context) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Supabase URL or Service Role Key not configured." }),
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // SQL to get the total size of the current database
    const { data, error } = await supabase.rpc('get_db_size');

    if (error) {
      // Before running this, you need to create the function in Supabase SQL editor:
      // CREATE OR REPLACE FUNCTION get_db_size() RETURNS BIGINT AS $$
      //   SELECT pg_database_size(current_database());
      // $$ LANGUAGE sql STABLE;
      console.error("Error fetching DB size:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to execute SQL query.', details: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ db_size: data }), // The RPC call returns the size directly
    };

  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal server error." }),
    };
  }
};

export { handler };