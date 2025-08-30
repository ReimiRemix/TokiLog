import { createClient } from '@supabase/supabase-js';
import type { Config, Context } from '@netlify/functions';

export const config: Config = {
  path: '/get-followed-users-timeline-restaurants',
  method: ['GET'],
};

export default async (req: Request, context: Context) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Get all accepted follow relationships for the current user
    const { data: followRelationships, error: followError } = await supabase
      .from('follow_relationships')
      .select('followed_id')
      .eq('follower_id', user.id)
      .eq('status', 'accepted');

    if (followError) {
      console.error('Error fetching follow relationships:', followError);
      return new Response(JSON.stringify({ error: followError.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!followRelationships || followRelationships.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const followedUserIds = followRelationships.map(f => f.followed_id);

    // Fetch restaurants for all followed users
    // Also fetch user_profile information for each restaurant's user_id
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('*, user_profiles(username, display_name)') // Select all restaurant fields and user profile info
      .in('user_id', followedUserIds)
      .order('created_at', { ascending: false }); // Order by creation date for timeline

    if (restaurantsError) {
      console.error('Error fetching followed users\' restaurants:', restaurantsError);
      return new Response(JSON.stringify({ error: restaurantsError.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Map the data to include user info directly in each restaurant object
    const timelineData = restaurants.map(r => ({
      ...r,
      user_profile: r.user_profiles, // Rename for clarity
      user_profiles: undefined, // Remove original nested object
    }));

    return new Response(JSON.stringify(timelineData), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Unhandled error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
};
