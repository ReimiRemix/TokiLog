import type { Handler, HandlerEvent } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Supabase URL or Service Role Key not configured.' }) };
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { api_type, input_tokens, output_tokens } = JSON.parse(event.body || '{}');
    if (!api_type) {
      return { statusCode: 400, body: JSON.stringify({ error: 'api_type is required' }) };
    }

    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Authorization header missing.' }) };
    }

    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    const { error } = await supabaseAdmin.from('api_usage_logs').insert({ user_id: user?.id, api_type, input_tokens, output_tokens });

    if (error) {
      throw error;
    }

    return { statusCode: 201, body: JSON.stringify({ message: 'Usage logged.' }) };

  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error.' }),
    };
  }
};

export { handler };
