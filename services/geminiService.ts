
import type { RestaurantDetails, SearchQuery, Source } from '../types';

interface FetchResult {
  details: RestaurantDetails[] | null;
  sources: Source[];
  inputTokens?: number;
  outputTokens?: number;
}

export const fetchRestaurantDetails = async (query: SearchQuery): Promise<FetchResult> => {
  try {
    const response = await fetch('/.netlify/functions/gemini-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      // Handle non-OK responses more robustly
      const errorText = await response.text();
      let errorMessage;
      try {
        // Try to parse as JSON first
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error;
      } catch (e) {
        // Fallback to raw text if not JSON, truncate for readability
        errorMessage = errorText.slice(0, 150);
      }
      throw new Error(errorMessage || `サーバーエラーが発生しました (ステータス: ${response.status})`);
    }
    
    // Handle OK responses, checking for empty body to prevent JSON parsing errors
    const responseText = await response.text();
    if (!responseText) {
      // If the body is empty despite a 200 OK, treat as no results found.
      return { details: [], sources: [] };
    }

    return JSON.parse(responseText);

  } catch (error) {
    console.error("Error fetching data from backend function:", error);
    // Propagate the error so the UI can display a more specific message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('不明なエラーが発生しました。');
  }
};
