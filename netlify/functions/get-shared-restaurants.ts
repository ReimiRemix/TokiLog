
import { createClient } from '@supabase/supabase-js';
import type { Handler } from "@netlify/functions";
import type { Restaurant } from '../../types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase environment variables are not set.");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const shareId = event.queryStringParameters?.id;
  if (!shareId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Share ID is required.' }) };
  }
  
  try {
    const { data: share, error: shareError } = await supabaseAdmin
      .from('shares')
      .select('user_id, expires_at')
      .eq('id', shareId)
      .single();

    if (shareError) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Share link not found.' }) };
    }
    
    if (new Date(share.expires_at) < new Date()) {
      return { statusCode: 410, body: JSON.stringify({ error: 'This share link has expired.' }) };
    }

    const { data: restaurants, error: restaurantsError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('user_id', share.user_id);
    
    if (restaurantsError) {
      throw restaurantsError;
    }

    // Convert snake_case from DB to camelCase for the client
    const formattedRestaurants = restaurants.map(r => ({
        id: r.id,
        createdAt: r.created_at,
        name: r.name,
        address: r.address,
        hours: r.hours,
        latitude: r.latitude,
        longitude: r.longitude,
        prefecture: r.prefecture,
        city: r.city,
        website: r.website,
        sources: r.sources,
        visitCount: r.visit_count,
        userComment: r.user_comment,
        customUrl: r.custom_url,
        genres: r.genres,
    })) as Restaurant[];


    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedRestaurants),
    };
  } catch (error: any) {
    console.error("Error getting shared restaurants:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Failed to retrieve shared list." }),
    };
  }
};
