import { NextResponse } from 'next/server';
import { ai, chatModel } from '@/lib/gemini';
import { retrieveChunks } from '@/lib/retrieval';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    // Per-IP rate limiting (20 chat queries per minute)
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`chat:${ip}`, 20, 60_000);

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: `Chat rate limit reached. Please wait ${retryAfter} seconds before asking another question.`,
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

    let body: { question?: string; message?: string; prompt?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request format. Expected JSON body' },
        { status: 400 }
      );
    }

    const question = body.question || body.message || body.prompt;
    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json(
        { error: 'Please enter a question to ask' },
        { status: 400 }
      );
    }

    // Embed question and retrieve top 8 matching chunks
    const chunks = await retrieveChunks(question.trim(), 8);

    // Format retrieved context chunks
    const contextText = chunks.length > 0
      ? chunks
          .map(
            (chunk, idx) =>
              `[${idx + 1}] Document: ${chunk.document_name}, Page: ${chunk.page}\n${chunk.content}`
          )
          .join('\n\n')
      : 'No document context available.';

    const systemInstruction = `You are a business document assistant.
Answer the user's question ONLY using the provided context. Do NOT use outside knowledge or make assumptions.
When stating facts from the context, cite sources using [1]..[8] based on the matching context numbers.
For broad or list-style questions, cover EVERY relevant item found across ALL provided context chunks — do not stop after the first match.
If the documents do not directly answer the question but contain closely related information, say so in one sentence and then summarize that related information with citations.
Only reply "I couldn't find this in the documents." when the context contains nothing related to the question.`;

    const prompt = `Context:
${contextText}

Question:
${question.trim()}

Instructions:
- Answer ONLY from the context above.
- For list or broad questions, include every relevant item from all context chunks.
- Cite each fact with [n] matching the context number above.
- If the context is not a direct answer but is related, start with one sentence noting that, then summarize the related information with citations.
- Only say "I couldn't find this in the documents." if the context contains nothing related.`;

    // Stream generation from Gemini
    const responseStream = await ai.models.generateContentStream({
      model: chatModel,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    // Format sources with document name, page, and snippet
    const sources = chunks.map((chunk, idx) => ({
      id: idx + 1,
      documentName: chunk.document_name,
      document_name: chunk.document_name,
      page: chunk.page,
      snippet: chunk.content,
    }));

    const encoder = new TextEncoder();
    const isNDJSON = req.headers.get('accept')?.includes('application/x-ndjson');

    function formatMessage(data: unknown): Uint8Array {
      const json = JSON.stringify(data);
      return encoder.encode(isNDJSON ? `${json}\n` : `data: ${json}\n\n`);
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            if (chunk.text) {
              controller.enqueue(
                formatMessage({
                  type: 'text',
                  text: chunk.text,
                })
              );
            }
          }

          // Send sources in final JSON message
          controller.enqueue(
            formatMessage({
              type: 'sources',
              sources,
            })
          );

          controller.close();
        } catch (streamError) {
          controller.error(streamError);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': isNDJSON
          ? 'application/x-ndjson; charset=utf-8'
          : 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Internal server error';
    let friendly = raw;
    if (raw.includes('GEMINI_API_KEY')) {
      friendly = 'Server configuration error: Gemini API key is missing';
    } else if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('quota')) {
      friendly = 'Gemini rate limit or quota exceeded. Please try again in a few moments';
    } else if (raw.includes('Database error') || raw.includes('SUPABASE')) {
      friendly = 'Document retrieval error: Unable to query database';
    }
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
