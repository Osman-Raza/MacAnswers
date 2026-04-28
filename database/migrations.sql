-- MacAnswers — Supabase Migrations
-- Run this entire file in the Supabase SQL editor

-- Enable pgvector extension
create extension if not exists vector;

-- ─────────────────────────────────────────
-- Knowledge Base: scraped content chunks
-- ─────────────────────────────────────────
create table if not exists knowledge_chunks (
  id          uuid primary key default gen_random_uuid(),
  source_url  text not null,
  source_name text not null,           -- e.g. "Tuition Fees", "Snow Day Alerts"
  content     text not null,
  embedding   vector(768),             -- Gemini text-embedding-004 dims
  scraped_at  timestamptz default now()
);

-- Index for fast similarity search
create index on knowledge_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Index to quickly delete old entries for a source before re-inserting
create index on knowledge_chunks (source_url);

-- ─────────────────────────────────────────
-- Campus Issue Tracker
-- ─────────────────────────────────────────
create type issue_category as enum (
  'electrical',
  'printer',
  'accessibility',
  'safety',
  'hvac',
  'plumbing',
  'wifi',
  'other'
);

create type issue_status as enum ('open', 'in_progress', 'resolved');

create table if not exists campus_issues (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  category     issue_category not null,
  status       issue_status default 'open',
  latitude     double precision not null,
  longitude    double precision not null,
  building     text,                   -- optional reverse-geocoded building name
  upvotes      integer default 0,
  reported_at  timestamptz default now(),
  resolved_at  timestamptz
);

-- Prevent duplicate upvotes per session (stored client-side too, but belt-and-suspenders)
create table if not exists issue_upvotes (
  issue_id    uuid references campus_issues(id) on delete cascade,
  voter_token text not null,           -- anonymous fingerprint from client
  primary key (issue_id, voter_token)
);

-- ─────────────────────────────────────────
-- Utility: RPC for upvoting
-- ─────────────────────────────────────────
create or replace function increment_upvote(issue_id uuid, voter text)
returns void language plpgsql as $$
begin
  insert into issue_upvotes (issue_id, voter_token) values (issue_id, voter)
    on conflict do nothing;
  if found then
    update campus_issues set upvotes = upvotes + 1 where id = issue_id;
  end if;
end;
$$;

-- ─────────────────────────────────────────
-- Utility: semantic search function
-- ─────────────────────────────────────────
create or replace function match_chunks(
  query_embedding vector(768),
  match_count     int default 5,
  match_threshold float default 0.5
)
returns table (
  id          uuid,
  source_url  text,
  source_name text,
  content     text,
  similarity  float
)
language sql stable as $$
  select
    id, source_url, source_name, content,
    1 - (embedding <=> query_embedding) as similarity
  from knowledge_chunks
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
