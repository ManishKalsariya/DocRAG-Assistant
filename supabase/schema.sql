create extension if not exists vector;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  content text not null,
  page int,
  embedding vector(768)
);

create index if not exists chunks_embedding_hnsw_idx
on chunks using hnsw (embedding vector_cosine_ops);

create or replace function match_chunks (
  query_embedding vector(768),
  match_count int
)
returns table (
  content text,
  page int,
  document_name text,
  similarity float
)
language sql stable
as $$
  select
    chunks.content,
    chunks.page,
    documents.name as document_name,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from chunks
  join documents on chunks.document_id = documents.id
  order by chunks.embedding <=> query_embedding
  limit match_count;
$$;
