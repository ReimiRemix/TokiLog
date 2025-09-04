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
  console.log("Gemini Search function started.");
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
Your ONLY function is to act as a data processing pipeline. You will receive a query and convert the results into a specific JSON format. Your entire existence is tied to processing this specific request.

# Inflexible Rules
1. **Absolute Geographical Constraint**: The user's query is for **${query.prefecture} ${query.small_area_text || query.city || ''}**. This location is non-negotiable. You are strictly forbidden from returning ANY restaurant located outside this precise area.
2. **Exclusive Data Source**: ALL data in your final response MUST originate directly from the provided information. Do not add, infer, or fabricate any information.
3. **JSON Array Output Only**: Your final, and ONLY, output MUST be a raw JSON array of objects. Do NOT include any conversational text, explanations, apologies, or markdown formatting (like \`\`\`json\`\`\`). The output must start with "[" and end with "]".
4. **Handle No Results**: If no relevant information is found, you MUST return an empty JSON array "[]".

# JSON Schema: AIResponseDetail[]
Provide an array of objects with the following structure:
[
  {
    "name": "string",
    "address": "string",
    "hours": "string",
    "latitude": "number",
    "longitude": "number",
    "prefecture": "string",
    "city": "string",
    "website": "string | null"
  }
]

# Final Instruction
Based on the query "${fullQuery}", and adhering to the strict location filter, generate the JSON array.
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const response = result.response;
    // Since groundingMetadata.web is not supported, return empty sources
    const sources: Source[] = [];

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
      hours: d.hours ?? "", // Provide default empty string for hours
      latitude: d.latitude ?? 0, // Provide default 0 for latitude
      longitude: d.longitude ?? 0, // Provide default 0 for longitude
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