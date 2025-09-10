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

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const { email, password, displayName, username } = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email and password are required.' }) };
    }
    if (!displayName || !username) {
      return { statusCode: 400, body: JSON.stringify({ error: 'DisplayName and username are required.' }) };
    }

    // Verify if the request is from a super admin
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Authorization header missing.' }) };
    }

    const token = authHeader.split(' ')[1];
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token.' }) };
    }

    // Check if the requesting user is a super admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', requestingUser.id)
      .single();

    if (profileError || !profile?.is_super_admin) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden: Only super admins can create users.' }) };
    }

    // Create user without email confirmation
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createUserError) {
      throw createUserError;
    }
    
    if (!newUser || !newUser.user) {
      throw new Error('Failed to create user.');
    }

    // Insert into user_profiles
    const { error: insertProfileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: newUser.user.id,
        display_name: displayName,
        username: username,
      });

    if (insertProfileError) {
      console.error('Supabase Profile Insertion Error:', insertProfileError);
      // ロールバック: user_profiles への挿入が失敗した場合、Supabase Authで作成されたユーザーを削除
      if (newUser.user.id) {
        const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        if (deleteAuthUserError) {
          console.error('Failed to rollback auth user creation:', deleteAuthUserError);
        }
      }
      return { statusCode: 500, body: `Failed to insert user profile: ${insertProfileError.message}` };
    }


    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'User created successfully.', user: newUser.user }),
    };
  } catch (error: any) {
    console.error("Error creating user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to create user.' }),
    };
  }
};

export { handler };