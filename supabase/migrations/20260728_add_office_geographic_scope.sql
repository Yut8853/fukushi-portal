alter table public.offices
  alter column municipality_id drop not null;

alter table public.offices
  add column if not exists scope text not null default 'municipality',
  add column if not exists prefecture_code text references public.prefectures(code);

alter table public.offices
  add constraint offices_scope_check
  check (scope in ('municipality', 'prefecture', 'national'));

alter table public.offices
  add constraint offices_geographic_scope_check
  check (
    (scope = 'municipality' and municipality_id is not null)
    or (scope = 'prefecture' and municipality_id is null and prefecture_code is not null)
    or (scope = 'national' and municipality_id is null and prefecture_code is null)
  );

create index if not exists offices_prefecture_scope_idx
  on public.offices (prefecture_code, category_id)
  where scope = 'prefecture' and status = 'published';
