create extension if not exists "pgcrypto";

create type verification_status as enum (
  'draft',
  'official_source_checked',
  'expert_checked',
  'published',
  'needs_review',
  'archived'
);

create table prefectures (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text unique not null
);

create table municipalities (
  id uuid primary key default gen_random_uuid(),
  prefecture_id uuid not null references prefectures(id),
  code text unique,
  name text not null,
  detail_level integer not null default 0 check (detail_level between 0 and 3),
  is_published boolean not null default false,
  unique(prefecture_id, name)
);

create table needs (
  id text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0
);

create table programs (
  id uuid primary key default gen_random_uuid(),
  need_id text not null references needs(id),
  national_title text not null,
  summary text not null,
  support_type text,
  repayment_required boolean,
  base_action text,
  base_script text,
  status verification_status not null default 'draft',
  published_at timestamptz
);

create table offices (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid references municipalities(id),
  name text not null,
  office_type text not null,
  address text,
  phone text,
  email text,
  website_url text,
  opening_hours text,
  reservation_required boolean,
  accessibility_notes text,
  emergency_alternative text,
  status verification_status not null default 'draft',
  verified_at timestamptz,
  review_due_at timestamptz
);

create table office_jurisdictions (
  office_id uuid not null references offices(id) on delete cascade,
  municipality_id uuid not null references municipalities(id) on delete cascade,
  primary key(office_id, municipality_id)
);

create table regional_programs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id),
  municipality_id uuid not null references municipalities(id),
  office_id uuid references offices(id),
  local_title text,
  local_summary text,
  eligibility_notes text,
  amount_notes text,
  deadline_notes text,
  action_text text,
  script_text text,
  documents jsonb not null default '[]'::jsonb,
  missing_documents_note text,
  status verification_status not null default 'draft',
  verified_at timestamptz,
  review_due_at timestamptz,
  unique(program_id, municipality_id)
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  regional_program_id uuid references regional_programs(id) on delete cascade,
  office_id uuid references offices(id) on delete cascade,
  source_title text not null,
  source_url text not null,
  source_type text not null default 'official',
  checked_at timestamptz not null default now(),
  content_hash text,
  is_active boolean not null default true
);

create table verification_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  previous_status verification_status,
  new_status verification_status not null,
  verifier_name text,
  note text,
  created_at timestamptz not null default now()
);

create index municipalities_prefecture_idx on municipalities(prefecture_id);
create index offices_municipality_idx on offices(municipality_id);
create index regional_programs_municipality_idx on regional_programs(municipality_id);
create index regional_programs_status_idx on regional_programs(status);
create index sources_checked_at_idx on sources(checked_at);
