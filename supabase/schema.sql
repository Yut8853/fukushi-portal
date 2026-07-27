create extension if not exists "pgcrypto";

create type public.content_status as enum (
  'draft', 'researching', 'review_required', 'verified', 'published',
  'expired', 'suspended'
);
create type public.municipality_type as enum ('special_ward', 'city', 'town', 'village');
create type public.support_level as enum ('basic', 'standard', 'detailed');
create type public.program_scope as enum ('national', 'prefecture', 'municipality', 'private');
create type public.support_type as enum (
  'benefit', 'loan', 'reduction', 'deferment', 'goods', 'housing',
  'consultation', 'medical', 'employment', 'other'
);
create type public.admin_role as enum ('admin', 'reviewer');

create table public.prefectures (
  code text primary key check (code ~ '^[0-9]{2}$'),
  name text unique not null,
  name_kana text not null default ''
);

create table public.categories (
  id text primary key,
  label text not null,
  description text not null default '',
  consultation_script text not null,
  sort_order integer not null default 0 check (sort_order >= 0)
);

create table public.municipalities (
  id text primary key,
  prefecture_code text not null references public.prefectures(code),
  municipality_code text unique not null,
  name text not null,
  name_kana text not null default '',
  municipality_type public.municipality_type not null,
  official_url text not null default '',
  representative_phone text not null default '',
  support_level public.support_level not null default 'basic',
  status public.content_status not null default 'draft',
  last_verified_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prefecture_code, name)
);

create table public.sources (
  id text primary key,
  title text not null,
  url text not null,
  publisher text not null default '',
  source_type text not null default 'official' check (source_type in ('official', 'law', 'other')),
  status public.content_status not null default 'draft',
  last_verified_at date,
  content_hash text not null default '',
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offices (
  id text primary key,
  municipality_id text not null references public.municipalities(id) on delete cascade,
  category_id text not null references public.categories(id),
  name text not null,
  plain_name text not null default '',
  department text not null default '',
  description text not null default '',
  postal_code text not null default '',
  address text not null default '',
  phone text not null default '',
  fax text not null default '',
  email text not null default '',
  contact_form_url text not null default '',
  official_url text not null default '',
  opening_hours text not null default '',
  closed_days text not null default '',
  reservation_required boolean,
  available_methods text not null default '',
  accessibility text not null default '',
  languages text not null default '',
  emergency_alternative text not null default '',
  service_area text not null default '',
  eligibility_conditions text not null default '',
  contact_type text not null check (contact_type in ('direct', 'self-reliance', 'representative')),
  verification_level text not null check (
    verification_level in ('primary_source_import', 'human_verified', 'user_reported')
  ),
  source_id text references public.sources(id),
  status public.content_status not null default 'draft',
  last_verified_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.programs (
  id text primary key,
  name text not null,
  plain_name text not null,
  category_id text not null references public.categories(id),
  scope public.program_scope not null,
  description text not null,
  target_people text not null default '',
  support_type public.support_type not null,
  repayment_required boolean not null default false,
  amount_description text not null default '',
  application_deadline text not null default '',
  required_documents text not null default '',
  documents_optional_note text not null default '',
  application_flow text not null default '',
  office_id text references public.offices(id),
  municipality_id text references public.municipalities(id),
  source_id text references public.sources(id),
  status public.content_status not null default 'draft',
  last_verified_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scope <> 'municipality' or municipality_id is not null)
);

create table public.municipality_programs (
  id text primary key,
  municipality_id text not null references public.municipalities(id) on delete cascade,
  program_id text not null references public.programs(id) on delete cascade,
  local_name text not null default '',
  local_description text not null default '',
  office_id text references public.offices(id),
  source_id text references public.sources(id),
  status public.content_status not null default 'draft',
  last_verified_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (municipality_id, program_id)
);

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.admin_role not null default 'reviewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.verification_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  previous_status public.content_status,
  new_status public.content_status,
  actor_user_id uuid references auth.users(id),
  actor_name text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table public.source_monitor_logs (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.sources(id) on delete cascade,
  status text not null check (status in ('ok', 'changed', 'blocked_by_robots', 'failed')),
  checked_at timestamptz not null,
  content_hash text not null default '',
  previous_hash text not null default '',
  http_status integer,
  content_type text not null default '',
  content_length bigint not null default 0,
  error text not null default ''
);

create table public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  page_id text not null check (char_length(page_id) between 1 and 120),
  category_id text not null check (char_length(category_id) between 1 and 40),
  helpful boolean not null,
  created_at timestamptz not null default now()
);

create table public.feedback_rate_limits (
  token text primary key check (char_length(token) = 64),
  request_count integer not null default 1 check (request_count > 0),
  expires_at timestamptz not null
);

create index municipalities_prefecture_idx on public.municipalities(prefecture_code);
create index municipalities_public_idx on public.municipalities(status, support_level);
create index offices_municipality_idx on public.offices(municipality_id);
create index offices_public_idx on public.offices(status, category_id);
create index programs_public_idx on public.programs(status, category_id);
create index municipality_programs_municipality_idx on public.municipality_programs(municipality_id);
create index sources_status_idx on public.sources(status);
create index verification_logs_entity_idx on public.verification_logs(entity_type, entity_id, created_at desc);
create index source_monitor_logs_source_idx on public.source_monitor_logs(source_id, checked_at desc);
create index feedback_events_created_at_idx on public.feedback_events(created_at desc);
create index feedback_events_page_category_idx
on public.feedback_events(page_id, category_id, created_at desc);
create index feedback_rate_limits_expires_at_idx on public.feedback_rate_limits(expires_at);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.check_feedback_rate_limit(
  p_token text,
  p_max_requests integer default 5
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  if char_length(p_token) <> 64 or p_max_requests < 1 then
    return false;
  end if;

  delete from public.feedback_rate_limits where expires_at <= now();
  delete from public.feedback_events where created_at < now() - interval '12 months';

  insert into public.feedback_rate_limits (token, request_count, expires_at)
  values (p_token, 1, now() + interval '10 minutes')
  on conflict (token) do update
  set request_count = public.feedback_rate_limits.request_count + 1
  where public.feedback_rate_limits.request_count < p_max_requests;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke all on function public.check_feedback_rate_limit(text, integer) from public;
grant execute on function public.check_feedback_rate_limit(text, integer) to service_role;

create trigger municipalities_updated_at before update on public.municipalities
for each row execute function public.set_updated_at();
create trigger sources_updated_at before update on public.sources
for each row execute function public.set_updated_at();
create trigger offices_updated_at before update on public.offices
for each row execute function public.set_updated_at();
create trigger programs_updated_at before update on public.programs
for each row execute function public.set_updated_at();
create trigger municipality_programs_updated_at before update on public.municipality_programs
for each row execute function public.set_updated_at();
create trigger admin_profiles_updated_at before update on public.admin_profiles
for each row execute function public.set_updated_at();

create or replace function public.current_admin_role()
returns public.admin_role language sql stable security definer set search_path = public as $$
  select role from public.admin_profiles
  where user_id = auth.uid() and active = true
  limit 1;
$$;

alter table public.prefectures enable row level security;
alter table public.categories enable row level security;
alter table public.municipalities enable row level security;
alter table public.sources enable row level security;
alter table public.offices enable row level security;
alter table public.programs enable row level security;
alter table public.municipality_programs enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.verification_logs enable row level security;
alter table public.source_monitor_logs enable row level security;
alter table public.feedback_events enable row level security;
alter table public.feedback_rate_limits enable row level security;

create policy "public read prefectures" on public.prefectures for select using (true);
create policy "public read categories" on public.categories for select using (true);
create policy "public read published municipalities" on public.municipalities for select using (status = 'published');
create policy "public read published sources" on public.sources for select using (status = 'published');
create policy "public read published offices" on public.offices for select using (status = 'published');
create policy "public read published programs" on public.programs for select using (status = 'published');
create policy "public read published municipality programs" on public.municipality_programs for select using (status = 'published');

create policy "staff manage prefectures" on public.prefectures for all
using (public.current_admin_role() in ('admin', 'reviewer'))
with check (public.current_admin_role() in ('admin', 'reviewer'));
create policy "staff manage categories" on public.categories for all
using (public.current_admin_role() in ('admin', 'reviewer'))
with check (public.current_admin_role() in ('admin', 'reviewer'));
create policy "staff manage municipalities" on public.municipalities for all
using (public.current_admin_role() in ('admin', 'reviewer'))
with check (public.current_admin_role() in ('admin', 'reviewer'));
create policy "staff manage sources" on public.sources for all
using (public.current_admin_role() in ('admin', 'reviewer'))
with check (public.current_admin_role() in ('admin', 'reviewer'));
create policy "staff manage offices" on public.offices for all
using (public.current_admin_role() in ('admin', 'reviewer'))
with check (public.current_admin_role() in ('admin', 'reviewer'));
create policy "staff manage programs" on public.programs for all
using (public.current_admin_role() in ('admin', 'reviewer'))
with check (public.current_admin_role() in ('admin', 'reviewer'));
create policy "staff manage municipality programs" on public.municipality_programs for all
using (public.current_admin_role() in ('admin', 'reviewer'))
with check (public.current_admin_role() in ('admin', 'reviewer'));

create policy "users read own admin profile" on public.admin_profiles for select
using (user_id = auth.uid() or public.current_admin_role() = 'admin');
create policy "admins manage profiles" on public.admin_profiles for all
using (public.current_admin_role() = 'admin')
with check (public.current_admin_role() = 'admin');
create policy "staff read verification logs" on public.verification_logs for select
using (public.current_admin_role() in ('admin', 'reviewer'));
create policy "staff insert verification logs" on public.verification_logs for insert
with check (public.current_admin_role() in ('admin', 'reviewer'));
create policy "staff read source monitor logs" on public.source_monitor_logs for select
using (public.current_admin_role() in ('admin', 'reviewer'));
create policy "staff insert source monitor logs" on public.source_monitor_logs for insert
with check (public.current_admin_role() in ('admin', 'reviewer'));
