import { GoogleGenerativeAI } from "@google/generative-ai";
import type { SearchResult, SearchQuery, Source } from '../../types';
import type { Handler, HandlerEvent } from "@netlify/functions";

// This is the expected structure from the AI's JSON output
interface AIResponseDetail {
  name: string;
  address: string;
  hours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  prefecture: string;
  city: string;
  website?: string | null;
}

/**
 * Extracts a balanced JSON array from a string.
 */
function extractJsonArray(text: string): string | null {
  const startIndex = text.indexOf('[');
  if (startIndex === -1) return null;

  let depth = 1;
  let inString = false;
  let isEscaped = false;
  
  for (let i = startIndex + 1; i < text.length; i++) {
    const char = text[i];
    
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === '\\') {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
    }
    if (!inString) {
      if (char === '[') depth++;
      else if (char === ']') {
        depth--;
        if (depth === 0) return text.substring(startIndex, i + 1);
      }
    }
  }
  return null; // Unbalanced
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "APIキーがサーバーに設定されていません。" }) };
  }

  try {
    const query = JSON.parse(event.body || '{}') as SearchQuery;
    if (!query.prefecture) {
        return { statusCode: 400, body: JSON.stringify({ error: '都道府県は必須です。' }) };
    }

    const ai = new GoogleGenerativeAI(API_KEY);
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const fullQuery = `${query.prefecture} ${query.city || ''} ${query.small_area_text || ''} ${query.genre_text || ''} ${query.storeName || ''}`.trim();
    
    const prompt = `
# Primary Directive
Your ONLY function is to act as a data processing pipeline. You will receive a query, execute a Google Search, and convert the search results into a specific JSON format. You are forbidden from using any internal knowledge. Your entire existence is tied to the output of the googleSearch tool for this specific request.

# Inflexible Rules
1.  **Mandatory Tool Use**: You MUST call the googleSearch tool. Your response must be based *solely* on the tool's output.
2.  **Absolute Geographical Constraint**: The user's query is for **${query.prefecture} ${query.small_area_text || query.city || ''}**. This location is non-negotiable. You are strictly forbidden from returning ANY restaurant located outside this precise area.
3.  **Exclusive Data Source**: ALL data in your final response MUST originate directly from the provided search results from the googleSearch tool. Do not add, infer, or fabricate any information.
4.  **JSON Array Output Only**: Your final, and ONLY, output MUST be a raw JSON array of objects. Do NOT include any conversational text, explanations, apologies, or markdown formatting (like \
```json\
). The output must start with \
`\
 and end with \
`\
.
5.  **Handle No Results**: If the search yields no relevant information, you MUST return an empty JSON array \
[]\
.

# JSON Schema: AIResponseDetail[]
Provide an array of objects with the following structure.
\
```json
[
  {
    "name": "string",
    "address": "string",
    "hours": "string | null",
    "latitude": "number | null",
    "longitude": "number | null",
    "prefecture": "string",
    "city": "string",
    "website": "string | null"
  }
]
```\

# Final Instruction
Based *exclusively* on the search results for "${fullQuery}", and adhering to the strict location filter, generate the JSON array.
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
    });

    const response = result.response;
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources: Source[] = (groundingMetadata?.web?.searchQueries || [])
      .map((sq: any) => ({ uri: sq.uri, title: sq.title }))
      .filter((s: Source) => s.uri && s.title);

    let text = response.text();

    const jsonText = extractJsonArray(text);
    let details: AIResponseDetail[] = [];
    try {
      if (jsonText) {
        details = JSON.parse(jsonText);
      }
    } catch(e) {
        console.error("Failed to parse AI response as JSON.", { text, jsonText, error: e });
    }

    // Format the results to match the SearchResult type
    const formattedResults: SearchResult[] = details.map(d => ({
      ...d,
      id: `${d.name}-${d.address}`, // Create a semi-unique ID
      isFromHotpepper: false,
      // Ensure required fields for HotpepperRestaurant are handled if needed, but this is for GeminiRestaurant
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ details: formattedResults, sources }),
    };

  } catch (error) {
    console.error("Error in gemini-search function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : "検索中に内部エラーが発生しました。" }),
    };
  }
};

export { handler };