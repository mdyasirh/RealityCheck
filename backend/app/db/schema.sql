-- =============================================================
-- RealityCheck – Supabase / PostgreSQL schema
-- Run this in the Supabase SQL Editor to create the tables.
-- =============================================================

-- Enable the pgcrypto extension for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----- USERS TABLE -----
create table if not exists public.users (
    id              uuid primary key default gen_random_uuid(),
    email           text unique not null,
    subscription_tier text not null default 'free'
        check (subscription_tier in ('free', 'pro', 'enterprise')),
    created_at      timestamptz not null default now()
);

comment on table  public.users is 'Registered RealityCheck users.';
comment on column public.users.subscription_tier is 'One of: free, pro, enterprise.';

-- ----- SCANS TABLE -----
create table if not exists public.scans (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references public.users(id) on delete cascade,
    file_hash       text not null,
    result_score    real check (result_score >= 0 and result_score <= 100),
    is_ai           boolean,
    media_type      text check (media_type in ('image', 'audio', 'video')),
    created_at      timestamptz not null default now()
);

create index if not exists idx_scans_user_id on public.scans(user_id);
create index if not exists idx_scans_file_hash on public.scans(file_hash);

comment on table  public.scans is 'Individual deepfake-detection scan results.';
comment on column public.scans.file_hash is 'SHA-256 hash of the uploaded file.';
comment on column public.scans.result_score is 'AI-generation likelihood score (0-100).';

-- ----- ROW LEVEL SECURITY -----
alter table public.users enable row level security;
alter table public.scans enable row level security;

-- Users can read their own row
create policy "Users can view own profile"
    on public.users for select
    using (auth.uid() = id);

-- Users can read their own scans
create policy "Users can view own scans"
    on public.scans for select
    using (auth.uid() = user_id);

-- Service role can do everything (used by the backend)
-- The service-role key bypasses RLS automatically in Supabase.
