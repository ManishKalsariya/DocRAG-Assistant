# PROJECT SPECIFICATION

## Product
RAG chatbot for business documents. Users upload PDFs/TXT, then ask questions; answers cite the source file and page.

## Stack
- Next.js (App Router, TypeScript, Tailwind CSS)
- Supabase Postgres + pgvector
- Gemini API (`@google/genai`) for embeddings and chat
- `unpdf` for PDF parsing
- Deployed on Vercel

## Environment Variables
- `GEMINI_API_KEY`
- `GEMINI_CHAT_MODEL`
- `GEMINI_EMBED_MODEL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Directory Structure
- `lib/` (clients, chunking, retrieval, rate limiting)
- `app/api/ingest/` (file processing and embeddings)
- `app/api/chat/` (RAG retrieval and streaming responses)
- `app/api/documents/` (document listing)
- `app/api/documents/[id]/` (document deletion)
- `components/` (chat UI, sidebar, file uploader, citations)

## Implemented Features
- **Document Ingestion**: `POST /api/ingest` parses PDF/TXT via `unpdf`, chunks text, generates embeddings with `@google/genai` (`gemini-embedding-001`, 768-dim), and stores documents and chunks in Supabase pgvector.
- **Document Management**: `GET /api/documents` lists indexed files; `DELETE /api/documents/[id]` removes documents with cascading chunk deletions; sidebar delete button with confirmation and loading state.
- **RAG Chat & Citations**: `POST /api/chat` retrieves top-8 context chunks via pgvector `match_chunks`, streams responses strictly from context, and emits source citations [1]..[8]. For broad/list questions the model covers every relevant item across all chunks; for partial matches it notes the gap and summarises related info with citations before falling back to "I couldn't find this in the documents."
- **Per-IP Rate Limiting**: In-memory rate limiting (`lib/rate-limit.ts`) on `/api/chat` (20 req/min) and `/api/ingest` (10 req/min) with 429 status and `Retry-After` headers.
- **Friendly Error Handling**: User-facing error messages for upload limits, network loss, rate limiting, and server/database exceptions.

## Rules
- Keep code minimal
- No unnecessary libraries
- TypeScript strict
- Short comments only

