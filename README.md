# RAG Chatbot

A Retrieval-Augmented Generation (RAG) chatbot for business documents. Upload PDFs or plain-text files, then ask questions — answers are grounded strictly in the uploaded content and include labeled citations back to the source file and page.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router                 │
│  ┌─────────────┐   ┌──────────────────────────────────┐  │
│  │   Sidebar   │   │          Chat Window             │  │
│  │ FileUpload  │   │  ChatInput · ChatMessageItem     │  │
│  │ DocumentList│   │  CitationChip                    │  │
│  └──────┬──────┘   └──────────────┬───────────────────┘  │
└─────────┼────────────────────────┼────────────────────┘
          │ POST /api/ingest        │ POST /api/chat
          ▼                         ▼
┌─────────────────┐       ┌──────────────────────────┐
│  Ingest Route   │       │       Chat Route          │
│ unpdf → chunks  │       │  embed query → pgvector   │
│ embed → upsert  │       │  top-K chunks → Gemini    │
│ Supabase insert │       │  stream answer + citations│
└────────┬────────┘       └───────────┬───────────────┘
         │                            │
         └──────────┬─────────────────┘
                    ▼
         ┌──────────────────────┐
         │  Supabase Postgres   │
         │  + pgvector          │
         │  documents           │
         │  chunks (vector 768) │
         │  match_chunks() RPC  │
         └──────────────────────┘
```

### Key modules

| Path | Responsibility |
|---|---|
| `lib/supabase.ts` | Lazy Supabase client (service-role key) |
| `lib/gemini.ts` | Lazy Gemini client; `embedChunks()` batching |
| `lib/chunking.ts` | Split text into overlapping chunks |
| `lib/retrieval.ts` | Embed query → call `match_chunks` RPC |
| `lib/rate-limit.ts` | In-memory per-IP rate limiter |
| `app/api/ingest/route.ts` | `POST /api/ingest` — parse, chunk, embed, store |
| `app/api/chat/route.ts` | `POST /api/chat` — retrieve, stream, cite |
| `app/api/documents/route.ts` | `GET /api/documents` — list indexed files |
| `app/api/documents/[id]/route.ts` | `DELETE /api/documents/[id]` — remove with cascade |
| `components/` | React UI: Sidebar, FileUpload, ChatWindow, Citations |

### Data flow

1. **Ingest** — User uploads a PDF or TXT → `unpdf` extracts text by page → text is split into ~500-token overlapping chunks → each chunk is embedded by `text-embedding-004` (768-dim) → records inserted into `documents` and `chunks` tables in Supabase.

2. **Chat** — User sends a question → question is embedded → Supabase `match_chunks()` returns the top-5 most similar chunks via cosine similarity (HNSW index) → chunks are passed as context to `gemini-2.5-flash` → the answer streams back with `[1]…[5]` citation markers → citation metadata is emitted as a final JSON event.

3. **Rate limiting** — Requests to `/api/chat` are capped at **20 req/min** per IP and `/api/ingest` at **10 req/min** per IP. Exceeded requests receive HTTP 429 with a `Retry-After` header.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS 4 |
| AI — embeddings | Google Gemini `text-embedding-004` via `@google/genai` |
| AI — chat | Google Gemini `gemini-2.5-flash` (streaming) |
| Database | Supabase Postgres + `pgvector` |
| PDF parsing | `unpdf` |
| Deployment | Vercel |

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | — | Google AI Studio / Vertex AI API key |
| `GEMINI_CHAT_MODEL` | ❌ | `gemini-2.5-flash` | Model used for answer generation |
| `GEMINI_EMBED_MODEL` | ❌ | `text-embedding-004` | Model used for vector embeddings (must produce 768-dim) |
| `SUPABASE_URL` | ✅ | — | Supabase project URL (`https://<ref>.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | Service-role secret key (never expose to the browser) |

> **Security**: `SUPABASE_SERVICE_ROLE_KEY` is a powerful server-side credential. It is used only in API routes and never bundled into the client. Keep it out of version control.

---

## Setup

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com/) API key (or Vertex AI)

### 1. Clone & install

```bash
git clone <repo-url>
cd RAG
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 3. Initialise the Supabase schema

Run the SQL in `supabase/schema.sql` against your project. You can do this in the Supabase SQL editor or via the CLI:

```bash
supabase db push   # if using Supabase CLI with a linked project
# — or —
# paste supabase/schema.sql into the Supabase dashboard SQL editor
```

This creates:

- `documents` table — stores file name and upload timestamp
- `chunks` table — stores text chunks with 768-dim `vector` column and a cascade foreign key to `documents`
- `chunks_embedding_hnsw_idx` — HNSW index on `chunks.embedding` for fast cosine-similarity search
- `match_chunks(query_embedding, match_count)` — Postgres function called by the chat route

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Build for production

```bash
npm run build
npm start
```

---

## Project Structure

```
.
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Streaming RAG endpoint
│   │   ├── documents/
│   │   │   ├── route.ts           # GET  /api/documents
│   │   │   └── [id]/route.ts      # DELETE /api/documents/[id]
│   │   └── ingest/route.ts        # POST /api/ingest
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                   # Main page (Sidebar + ChatWindow)
├── components/
│   ├── ChatInput.tsx
│   ├── ChatMessageItem.tsx
│   ├── ChatWindow.tsx
│   ├── CitationChip.tsx
│   ├── DocumentList.tsx
│   ├── FileUpload.tsx
│   ├── Icons.tsx
│   ├── Sidebar.tsx
│   └── types.ts
├── lib/
│   ├── chunking.ts
│   ├── gemini.ts
│   ├── rate-limit.ts
│   ├── retrieval.ts
│   └── supabase.ts
├── supabase/
│   └── schema.sql
├── .env.example
└── PROJECT.md
```

---

## API Reference

### `POST /api/ingest`

Upload a document for indexing.

- **Rate limit**: 10 requests / minute per IP
- **Body**: `multipart/form-data` with a `file` field (PDF or TXT, max 10 MB)
- **Response**: `{ documentId: string, chunks: number }`

### `POST /api/chat`

Ask a question over indexed documents.

- **Rate limit**: 20 requests / minute per IP
- **Body**: `{ messages: { role: "user"|"assistant", content: string }[] }`
- **Response**: Server-Sent Events (`text/event-stream`)
  - `data: <token>` — streamed answer tokens
  - `data: [CITATIONS] { citations: Citation[] }` — final event with source metadata

### `GET /api/documents`

List all indexed documents.

- **Response**: `{ documents: { id, name, uploadedAt, chunkCount?, status }[] }`

### `DELETE /api/documents/:id`

Delete a document and all its chunks (cascade).

- **Response**: `{ success: true, id: string }`

---

## Deployment (Vercel)

1. Push the repo to GitHub / GitLab.
2. Import the project in the Vercel dashboard.
3. Add the five environment variables under **Project → Settings → Environment Variables**.
4. Deploy. The Next.js build runs `next build` automatically.

> The Supabase schema must be applied to the production database before the first request.
