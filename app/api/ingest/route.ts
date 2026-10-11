import { NextResponse } from 'next/server';
import { extractText } from 'unpdf';
import { splitIntoChunks, PageText } from '@/lib/chunking';
import { embedChunks } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  try {
    // Per-IP rate limiting (10 uploads per minute)
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`ingest:${ip}`, 10, 60_000);

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: `Upload rate limit reached. Please wait ${retryAfter} seconds before uploading another document.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Please choose a valid PDF or TXT file to upload' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds the 10MB limit. Please upload a smaller document' },
        { status: 413 }
      );
    }

    const fileName = file.name;
    const isPdf = fileName.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    const isTxt = fileName.toLowerCase().endsWith('.txt') || file.type === 'text/plain';

    if (!isPdf && !isTxt) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PDF and TXT files are supported' },
        { status: 400 }
      );
    }

    let pages: PageText[] = [];

    if (isPdf) {
      const buffer = await file.arrayBuffer();
      const { text } = await extractText(new Uint8Array(buffer), { mergePages: false });
      pages = Array.isArray(text)
        ? text.map((content, idx) => ({ page: idx + 1, text: content }))
        : [{ page: 1, text: String(text || '') }];
    } else {
      const text = await file.text();
      pages = [{ page: 1, text }];
    }

    const chunks = splitIntoChunks(pages, 800, 100);
    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'No readable text could be extracted from this document' },
        { status: 400 }
      );
    }

    // Embed all chunks in batches
    const texts = chunks.map((chunk) => chunk.content);
    const embeddings = await embedChunks(texts);

    // Save document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({ name: fileName })
      .select('id')
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: `Database error: ${docError?.message || 'failed to save document'}` },
        { status: 500 }
      );
    }

    // Save chunk records with vector embeddings
    const chunkRows = chunks.map((chunk, idx) => ({
      document_id: document.id,
      content: chunk.content,
      page: chunk.page,
      embedding: embeddings[idx],
    }));

    const { error: chunkError } = await supabase.from('chunks').insert(chunkRows);
    if (chunkError) {
      await supabase.from('documents').delete().eq('id', document.id);
      return NextResponse.json(
        { error: `Database error: ${chunkError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documentId: document.id,
      chunkCount: chunks.length,
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Internal server error';
    let friendly = raw;
    if (raw.includes('GEMINI_API_KEY')) {
      friendly = 'Server configuration error: Gemini API key is missing';
    } else if (raw.includes('SUPABASE')) {
      friendly = 'Server configuration error: Supabase credentials are missing';
    }
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
