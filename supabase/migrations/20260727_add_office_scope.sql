alter table public.offices
  add column if not exists service_area text not null default '',
  add column if not exists eligibility_conditions text not null default '';
