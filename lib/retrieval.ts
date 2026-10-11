import { embedChunks } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';

export interface RetrievedChunk {
  content: string;
  page: number;
  document_name: string;
  similarity: number;
}

// Embed question and retrieve top matching chunks from Supabase
export async function retrieveChunks(
  question: string,
  matchCount = 8
): Promise<RetrievedChunk[]> {
  const [embedding] = await embedChunks([question]);
  if (!embedding) {
    throw new Error('Failed to generate embedding for query');
  }

  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: embedding,
    match_count: matchCount,
  });

  if (error) {
    throw new Error(`Database error in match_chunks: ${error.message}`);
  }

  return (data as RetrievedChunk[]) || [];
}

export const matchChunks = retrieveChunks;
export const match_chunks = retrieveChunks;
