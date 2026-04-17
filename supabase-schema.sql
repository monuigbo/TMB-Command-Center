-- TMB Command Center v3 - Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ==================
-- LEADS TABLE
-- ==================
create table leads (
  id text primary key,
  user_id uuid not null references auth.users(id),
  first_name text not null default '',
  last_name text not null default '',
  company_name text not null default '',
  phone text not null default '',
  email text not null default '',
  address1 text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  source text not null default '',
  tags text[] not null default '{}',
  industry text not null default '',
  temperature text not null default '',
  pipeline text not null default 'sales',
  stage text not null default 'New Lead',
  monetary_value text not null default '',
  notes text not null default '',
  commitments text[] not null default '{}',
  created_at timestamptz not null default now(),
  last_contact_at timestamptz,
  history jsonb not null default '[]',
  -- GHL integration fields (ready for future use)
  ghl_contact_id text,
  ghl_sync_status text not null default 'not_synced',
  ghl_last_synced timestamptz,
  ghl_location_id text,
  -- Sync metadata
  updated_at timestamptz not null default now()
);

create index idx_leads_user on leads(user_id);
create index idx_leads_pipeline_stage on leads(user_id, pipeline, stage);
create index idx_leads_ghl_status on leads(ghl_sync_status) where ghl_sync_status != 'not_synced';
create index idx_leads_updated on leads(updated_at);

-- ==================
-- TASKS TABLE
-- ==================
create table tasks (
  id text primary key,
  user_id uuid not null references auth.users(id),
  text text not null,
  done boolean not null default false,
  priority text not null default 'medium',
  linked_lead text not null default '',
  created_at timestamptz not null default now(),
  -- GHL integration fields
  ghl_task_id text,
  ghl_sync_status text not null default 'not_synced',
  ghl_last_synced timestamptz,
  -- Sync metadata
  updated_at timestamptz not null default now()
);

create index idx_tasks_user on tasks(user_id);
create index idx_tasks_done on tasks(user_id, done);

-- ==================
-- PROSPECTING LOG TABLE
-- ==================
create table prospecting_log (
  id text primary key,
  user_id uuid not null references auth.users(id),
  date text not null,
  type text not null,
  timestamp timestamptz not null default now(),
  list_id text,
  contact_id text,
  outcome text,
  -- GHL integration fields
  ghl_activity_id text,
  ghl_sync_status text not null default 'not_synced',
  ghl_last_synced timestamptz,
  -- Sync metadata
  updated_at timestamptz not null default now()
);

create index idx_prospecting_user_date on prospecting_log(user_id, date);

-- ==================
-- CALL LISTS TABLE
-- ==================
create table call_lists (
  id text primary key,
  user_id uuid not null references auth.users(id),
  name text not null,
  industry text not null default '',
  created_at timestamptz not null default now(),
  contacts jsonb not null default '[]',
  -- GHL integration fields
  ghl_list_id text,
  ghl_sync_status text not null default 'not_synced',
  ghl_last_synced timestamptz,
  -- Sync metadata
  updated_at timestamptz not null default now()
);

create index idx_call_lists_user on call_lists(user_id);

-- ==================
-- AI CONVERSATIONS TABLE
-- ==================
create table ai_conversations (
  id text primary key,
  user_id uuid not null references auth.users(id),
  timestamp timestamptz not null default now(),
  date text not null,
  user_message text not null,
  ai_response text not null,
  extracted_data jsonb not null default '{}',
  -- Sync metadata
  updated_at timestamptz not null default now()
);

create index idx_ai_conversations_user on ai_conversations(user_id);
create index idx_ai_conversations_date on ai_conversations(user_id, date);

-- ==================
-- SETTINGS TABLE
-- ==================
create table settings (
  user_id uuid primary key references auth.users(id),
  daily_target integer not null default 5,
  -- GHL integration fields (ready for future use)
  ghl_api_key_encrypted text,
  ghl_location_id text,
  ghl_auto_sync boolean not null default false,
  -- Sync metadata
  updated_at timestamptz not null default now()
);

-- ==================
-- ROW LEVEL SECURITY
-- ==================
alter table leads enable row level security;
alter table tasks enable row level security;
alter table prospecting_log enable row level security;
alter table call_lists enable row level security;
alter table ai_conversations enable row level security;
alter table settings enable row level security;

create policy "users_own_leads" on leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_tasks" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_prospecting" on prospecting_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_call_lists" on call_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_conversations" on ai_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_settings" on settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ==================
-- AUTO-UPDATE updated_at TRIGGER
-- ==================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated before update on leads for each row execute function update_updated_at();
create trigger tasks_updated before update on tasks for each row execute function update_updated_at();
create trigger prospecting_log_updated before update on prospecting_log for each row execute function update_updated_at();
create trigger call_lists_updated before update on call_lists for each row execute function update_updated_at();
create trigger ai_conversations_updated before update on ai_conversations for each row execute function update_updated_at();
create trigger settings_updated before update on settings for each row execute function update_updated_at();

-- ==================
-- V1 PROSPECTING TAB MIGRATIONS
-- Run these in Supabase SQL Editor to extend existing tables.
-- All additive (IF NOT EXISTS) — safe to run on existing data.
-- ==================

-- Prospect list metadata (niche switcher)
alter table call_lists add column if not exists niche text;
alter table call_lists add column if not exists emoji text;
alter table call_lists add column if not exists notes text;
alter table call_lists add column if not exists last_cursor jsonb;
alter table call_lists add column if not exists archived_at timestamptz;

-- Per-touch notes on prospecting log entries
alter table prospecting_log add column if not exists notes text not null default '';

-- ==================
-- PHASE 2: business_profile TABLE
-- Uncomment when ready to ship auto-learn business context.
-- ==================
-- create table if not exists business_profile (
--   user_id uuid primary key references auth.users(id),
--   summary text not null default '',
--   facts jsonb not null default '[]',
--   updated_at timestamptz not null default now()
-- );
-- alter table business_profile enable row level security;
-- create policy "users_own_business_profile" on business_profile
--   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- create trigger business_profile_updated before update on business_profile
--   for each row execute function update_updated_at();
