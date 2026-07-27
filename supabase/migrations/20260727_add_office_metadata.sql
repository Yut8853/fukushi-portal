alter table public.offices
add column if not exists contact_type text,
add column if not exists verification_level text;

update public.offices o
set contact_type = case
  when o.category_id = 'unknown'
    or o.id like '%city-general'
    or regexp_replace(o.phone, '\D', '', 'g') = regexp_replace(m.representative_phone, '\D', '', 'g')
    then 'representative'
  when o.id like '%self-reliance%' or o.plain_name like '%自立相談%'
    then 'self-reliance'
  else 'direct'
end,
verification_level = coalesce(verification_level, 'primary_source_import')
from public.municipalities m
where o.municipality_id = m.id;

alter table public.offices
alter column contact_type set not null,
alter column verification_level set not null,
add constraint offices_contact_type_check
  check (contact_type in ('direct', 'self-reliance', 'representative')),
add constraint offices_verification_level_check
  check (verification_level in ('primary_source_import', 'human_verified', 'user_reported'));
