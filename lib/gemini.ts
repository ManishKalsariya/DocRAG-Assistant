import { GoogleGenAI } from '@google/genai';

export const embedModel = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
export const chatModel = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';

// Lazily-created singleton — validates env at runtime, not import time,
// so the Next.js build can collect route metadata without real credentials.
let _ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (_ai) return _ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable');
  }
  _ai = new GoogleGenAI({ apiKey });
  return _ai;
}

export const ai = new Proxy({} as GoogleGenAI, {
  get(_target, prop) {
    return (getAI() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Embed chunks in batches with output dimension 768
export async function embedChunks(
  texts: string[],
  batchSize = 100
): Promise<number[][]> {
  const client = getAI();
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await client.models.embedContent({
      model: embedModel,
      contents: batch,
      config: {
        outputDimensionality: 768,
      },
    });

    const items = response.embeddings;
    if (!items || items.length !== batch.length) {
      throw new Error('Embedding count mismatch with batch size');
    }

    for (const item of items) {
      if (!item.values || item.values.length !== 768) {
        throw new Error('Invalid embedding vector dimension received from Gemini');
      }
      embeddings.push(item.values);
    }
  }

  return embeddings;
}
