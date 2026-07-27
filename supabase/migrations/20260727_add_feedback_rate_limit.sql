create table if not exists public.feedback_rate_limits (
  token text primary key check (char_length(token) = 64),
  request_count integer not null default 1 check (request_count > 0),
  expires_at timestamptz not null
);

create index if not exists feedback_rate_limits_expires_at_idx
on public.feedback_rate_limits(expires_at);

alter table public.feedback_rate_limits enable row level security;

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
