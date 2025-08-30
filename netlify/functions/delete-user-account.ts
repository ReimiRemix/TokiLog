import { createClient } from '@supabase/supabase-js';
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: 'Supabase URL or Service Role Key not configured.' };
  }

  // Extract JWT from Authorization header
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) {
    return { statusCode: 401, body: 'Unauthorized: No token provided.' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // 1. Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return { statusCode: 401, body: `Unauthorized: ${userError?.message || 'Invalid token.'}` };
    }

    // 2. Use the admin client to delete the user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      throw deleteError;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Account deleted successfully.' }),
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    };
  } catch (error: any) {
    console.error('Error deleting user account:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'An internal server error occurred.' }),
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
};

export { handler };
