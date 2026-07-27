alter table public.categories
add column if not exists consultation_script text;

update public.categories
set consultation_script = case id
  when 'food' then '今日食べるものがなく、利用できる支援を相談したいです'
  when 'housing' then '今夜泊まる場所がなく、相談したいです'
  when 'rent' then '家賃が払えず住まいを失いそうで、相談したいです'
  when 'utilities' then '電気・ガス・水道が止まりそうで、支払いについて相談したいです'
  when 'money' then '生活費がなく、これからの生活について相談したいです'
  when 'medical' then '医療費が心配で病院に行けず、相談したいです'
  when 'work' then '仕事を失った、または働けない状況で、生活について相談したいです'
  when 'debt' then '借金の返済や差し押さえが心配で、相談したいです'
  when 'violence' then '家族や同居人から逃げる必要があり、安全について相談したいです'
  when 'children' then '子育て・妊娠・ひとり親家庭への支援について相談したいです'
  when 'mental' then '心も体も限界に近く、相談したいです'
  when 'disability' then '障害や病気があり、暮らしに必要な支援について相談したいです'
  when 'care' then '介護のため生活や仕事を続けることが難しく、相談したいです'
  when 'unknown' then '何から話せばよいか分かりませんが、生活について相談したいです'
  else '生活について相談したいです'
end
where consultation_script is null or consultation_script = '';

alter table public.categories
alter column consultation_script set not null;

create table if not exists public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  page_id text not null check (char_length(page_id) between 1 and 120),
  category_id text not null check (char_length(category_id) between 1 and 40),
  helpful boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists feedback_events_created_at_idx
on public.feedback_events(created_at desc);

create index if not exists feedback_events_page_category_idx
on public.feedback_events(page_id, category_id, created_at desc);

alter table public.feedback_events enable row level security;
