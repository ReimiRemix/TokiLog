import type { Handler, HandlerEvent } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';
import csv from 'csv-parser';
import { Readable } from 'stream';

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
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden: Only super admins can bulk register users.' }) };
    }

    // Parse CSV data
    const csvString = Buffer.from(event.body || '', 'base64').toString('utf8');
    const usersToRegister: any[] = [];
    const parseErrors: string[] = [];

    const stream = Readable.from([csvString]);

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row) => {
          // Expected CSV format: email,password,display_name,username
          if (row.email && row.password && row.display_name && row.username) {
            usersToRegister.push(row);
          } else {
            parseErrors.push(`Skipping row due to missing data: ${JSON.stringify(row)}`);
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          parseErrors.push(`CSV parsing error: ${err.message}`);
          reject(err);
        });
    });

    if (usersToRegister.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No valid users found in CSV or CSV is empty.', parseErrors }) };
    }

    const results = [];
    for (const user of usersToRegister) {
      try {
        // Create user in Supabase Auth
        const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true, // Or false, depending on desired flow
        });

        if (createUserError) {
          throw createUserError;
        }

        if (!newUser || !newUser.user) {
          throw new Error('Failed to create user in auth.');
        }

        // Insert user profile
        const { error: insertProfileError } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            id: newUser.user.id,
            display_name: user.display_name,
            username: user.username,
          });

        if (insertProfileError) {
          if (insertProfileError.code === '23505') { // Duplicate key error
            console.warn('Duplicate profile ID detected during bulk registration. Attempting to delete and re-insert.', newUser.user.id);
            // Attempt to delete the existing profile with the same ID
            const { error: deleteExistingProfileError } = await supabaseAdmin
              .from('user_profiles')
              .delete()
              .eq('id', newUser.user.id);

            if (deleteExistingProfileError) {
              console.error('Failed to delete existing duplicate profile during bulk registration:', deleteExistingProfileError);
              // If deletion fails, re-throw the original error
              throw insertProfileError; // Re-throw original error if cleanup fails
            }

            // Try inserting again after deleting the duplicate
            const { error: retryInsertError } = await supabaseAdmin
              .from('user_profiles')
              .insert({
                id: newUser.user.id,
                display_name: user.display_name,
                username: user.username,
              });

            if (retryInsertError) {
              console.error('Failed to insert profile after retry during bulk registration:', retryInsertError);
              // If retry fails, re-throw the original error
              throw retryInsertError; // Re-throw original error if retry fails
            }
          } else {
            // Re-throw other types of errors
            throw insertProfileError;
          }
        }

        results.push({ email: user.email, status: 'success' });
      } catch (error: any) {
        results.push({ email: user.email, status: 'failed', error: error.message });
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Bulk registration complete.', results, parseErrors }),
    };
  } catch (error: any) {
    console.error("Error in bulk-register-users function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error during bulk registration.' }),
    };
  }
};

export { handler };
