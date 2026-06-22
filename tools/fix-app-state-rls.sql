alter table public.kaiser_app_state enable row level security;

drop policy if exists "kaiser_app_state_authenticated_read" on public.kaiser_app_state;
drop policy if exists "kaiser_app_state_authenticated_write" on public.kaiser_app_state;
drop policy if exists "kaiser_app_state_public_read" on public.kaiser_app_state;
drop policy if exists "kaiser_app_state_public_write" on public.kaiser_app_state;
drop policy if exists "allow_read_app_state" on public.kaiser_app_state;
drop policy if exists "allow_insert_app_state" on public.kaiser_app_state;
drop policy if exists "allow_update_app_state" on public.kaiser_app_state;

create policy "allow_read_app_state"
on public.kaiser_app_state
for select
to anon, authenticated
using (id = 'production');

create policy "allow_insert_app_state"
on public.kaiser_app_state
for insert
to anon, authenticated
with check (id = 'production');

create policy "allow_update_app_state"
on public.kaiser_app_state
for update
to anon, authenticated
using (id = 'production')
with check (id = 'production');

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.kaiser_app_state to anon, authenticated;
revoke delete on public.kaiser_app_state from anon, authenticated;
