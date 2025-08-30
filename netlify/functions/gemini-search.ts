
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { RestaurantDetails, SearchQuery, Source } from '../../types';
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface FetchResult {
  details: RestaurantDetails[] | null;
  sources: Source[];
}

/**
 * Extracts a balanced JSON object or array from a string,
 * correctly handling nested structures and ignoring delimiters within strings.
 * @param text The string to search within.
 * @param openChar The opening character ('{' or '[').
 * @param closeChar The closing character ('}' or ']').
 * @returns The extracted JSON string, or null if not found.
 */
function extractJson(text: string, openChar: string, closeChar: string): string | null {
  const startIndex = text.indexOf(openChar);
  if (startIndex === -1) {
    return null;
  }

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
      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          return text.substring(startIndex, i + 1);
        }
      }
    }
  }
  
  return null; // Unbalanced
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "APIキーがサーバーに設定されていません。" }),
    };
  }

  try {
    const query = JSON.parse(event.body || '{}') as SearchQuery;
    console.log("Gemini Search - Incoming query:", query);

    if (!query.prefecture) {
        console.error("Gemini Search - Missing prefecture in query:", query);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: '都道府県は必須です。' }),
        };
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const fullQuery = `${query.prefecture} ${query.city || ''} ${query.storeName || ''}`.trim();
    console.log("Gemini Search - Full query for prompt:", fullQuery);
    const prompt = `# Primary Directive
Your ONLY function is to act as a data processing pipeline. You will receive a query, execute a Google Search, and convert the search results into a specific JSON format. You are forbidden from using any internal knowledge. Your entire existence is tied to the output of the googleSearch tool for this specific request.

# Inflexible Rules
1.  **Mandatory Tool Use**: You MUST call the googleSearch tool. Your response must be based *solely* on the tool's output.
2.  **Absolute Geographical Constraint**: The user's query is for ${query.prefecture} ${query.city || ''}. This location is non-negotiable. You are strictly forbidden from returning ANY restaurant located outside this precise area. If a search result has a name matching the query but is in a different prefecture or city, you MUST IGNORE and DISCARD it. For example, if the query is for "東京都" (Tokyo), a result in "大阪府" (Osaka) is invalid and must be excluded.
3.  **Exclusive Data Source**: ALL data in your final response MUST originate directly from the provided search results from the googleSearch tool. Do not add, infer, or fabricate any information.
4.  **JSON Array Output Only**: Your final, and ONLY, output MUST be a raw JSON array of objects that conform to the 'RestaurantDetails' interface. Do NOT include any conversational text, explanations, apologies, or markdown formatting (like ```json`). The output must start with `[` and end with `]`.
5.  **Handle No Results**: If the search yields no relevant information within the specified location, you MUST return an empty JSON array `[]`.
6.  **Handle Multiple Results**: If multiple distinct restaurant locations are found for the same name within the specified location, create a separate JSON object for each one within the main array.

# JSON Schema: RestaurantDetails[]
Provide an array of objects with the following structure. At least one object is expected if information is found.
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
```

# Final Instruction
Based *exclusively* on the search results for "${fullQuery}", and adhering to the strict location filter, generate the JSON array.

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    console.log("Gemini Search - Raw AI response:", response.text);

    // Extract sources from grounding metadata
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources: Source[] = (groundingMetadata?.groundingChunks || [])
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        uri: chunk.web.uri,
        title: chunk.web.title,
      }));
    
    let text = response.text.trim();

    // First, attempt to extract JSON from a markdown code block.
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      text = codeBlockMatch[1].trim();
    }

    // Then, find the first valid, balanced JSON array within the text.
    const jsonText = extractJson(text, '[', ']');

    let details;
    try {
        if (!jsonText) {
            // If no valid JSON array is found, return empty results as per the prompt's instructions.
            details = [];
        } else {
            details = JSON.parse(jsonText);
        }
    } catch(e) {
        console.error("Failed to parse search response as JSON. Original response:", response.text, "Processed text:", jsonText, "Error:", e);
        details = []; // Fallback to empty array on parsing error
    }

    const result: FetchResult = {
      details: Array.isArray(details) ? details : [],
      sources,
    };
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
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
