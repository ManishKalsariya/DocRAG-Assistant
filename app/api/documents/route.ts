import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface DbDocument {
  id: string;
  name: string;
  created_at?: string;
  chunks?: { count: number }[];
}

export async function GET() {
  try {
    // Attempt to query documents with related chunk count
    const { data, error } = await supabase
      .from('documents')
      .select('id, name, created_at, chunks(count)')
      .order('created_at', { ascending: false });

    let docs: DbDocument[] | null = data;

    // Fallback if relation count is not supported by database schema cache
    if (error) {
      const fallback = await supabase
        .from('documents')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });

      if (fallback.error) {
        return NextResponse.json(
          { error: `Database error: ${fallback.error.message}` },
          { status: 500 }
        );
      }
      docs = fallback.data as DbDocument[];
    }

    const documents = (docs || []).map((doc: DbDocument) => ({
      id: doc.id,
      name: doc.name,
      uploadedAt: doc.created_at
        ? new Date(doc.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Just now',
      chunkCount:
        Array.isArray(doc.chunks) && doc.chunks[0]?.count != null
          ? Number(doc.chunks[0].count)
          : undefined,
      size: 0,
      status: 'ready' as const,
    }));

    return NextResponse.json({ documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
