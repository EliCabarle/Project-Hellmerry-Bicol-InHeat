-- QA chatbot: hybrid RAG + function calling (CONCEPT 6d, promoted to CORE 11-13-2026)
--
-- This migration stores ONLY the unstructured corpus. Structured answers come from
-- public.municipality_trends through function calling - they are not duplicated here.
--
-- pgvector is already enabled on this project (verified 11-13-2026 with
-- `select '[1,2,3]'::vector`). The `create extension` below is a no-op guard.

create extension if not exists vector;

-- One row per source markdown file. sha256 lets embed_documents.py skip unchanged
-- files on a re-run instead of re-embedding 21 documents every time.
create table if not exists public.qa_documents (
    id          bigserial primary key,
    source_path text        not null,
    title       text        not null,
    sha256      text        not null,
    created_at  timestamptz not null default now(),
    constraint qa_documents_source_path_key unique (source_path)
);

-- Heading-delimited slices of a document, each with its embedding.
create table if not exists public.qa_chunks (
    id          bigserial primary key,
    document_id bigint      not null references public.qa_documents(id) on delete cascade,
    chunk_index int         not null,
    heading     text,
    content     text        not null,
    token_count int,
    embedding   vector(1536) not null,
    created_at  timestamptz not null default now(),
    constraint qa_chunks_document_chunk_key unique (document_id, chunk_index)
);

-- HNSW + vector_cosine_ops matches the `<=>` operator used by match_documents().
create index if not exists qa_chunks_embedding_idx
    on public.qa_chunks using hnsw (embedding vector_cosine_ops);

-- Retrieval is public read. Writes stay service-role only: there is deliberately
-- no insert/update/delete policy, so anon cannot write.
alter table public.qa_documents enable row level security;
alter table public.qa_chunks    enable row level security;

drop policy if exists qa_documents_public_read on public.qa_documents;
create policy qa_documents_public_read on public.qa_documents
    for select using (true);

drop policy if exists qa_chunks_public_read on public.qa_chunks;
create policy qa_chunks_public_read on public.qa_chunks
    for select using (true);

-- Cosine similarity search. Called by apps/api/routers/qa.py.
-- `security invoker` on purpose: the public-read policies above already allow the
-- read, so the function does not need to escalate to definer rights.
create or replace function public.match_documents(
    query_embedding vector(1536),
    match_threshold float default 0.30,
    match_count     int   default 6
)
returns table (
    id          bigint,
    document_id bigint,
    title       text,
    source_path text,
    heading     text,
    content     text,
    similarity  float
)
language sql
stable
as $$
    select
        c.id,
        c.document_id,
        d.title,
        d.source_path,
        c.heading,
        c.content,
        1 - (c.embedding <=> query_embedding) as similarity
    from public.qa_chunks c
    join public.qa_documents d on d.id = c.document_id
    where 1 - (c.embedding <=> query_embedding) >= match_threshold
    order by c.embedding <=> query_embedding
    limit match_count;
$$;
