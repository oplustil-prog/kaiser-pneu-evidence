create table if not exists public.kaiser_app_state (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  counts jsonb not null default '{}'::jsonb,
  app_version text,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.kaiser_app_state enable row level security;

drop policy if exists "kaiser_app_state_authenticated_read" on public.kaiser_app_state;
drop policy if exists "kaiser_app_state_authenticated_write" on public.kaiser_app_state;

create policy "kaiser_app_state_authenticated_read"
on public.kaiser_app_state
for select
to authenticated
using (id = 'production');

create policy "kaiser_app_state_authenticated_write"
on public.kaiser_app_state
for all
to authenticated
using (id = 'production')
with check (id = 'production');

insert into storage.buckets (id, name, public)
values ('kaiser-documents', 'kaiser-documents', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "kaiser_documents_authenticated_read" on storage.objects;
drop policy if exists "kaiser_documents_authenticated_write" on storage.objects;

create policy "kaiser_documents_authenticated_read"
on storage.objects
for select
to authenticated
using (bucket_id = 'kaiser-documents');

create policy "kaiser_documents_authenticated_write"
on storage.objects
for all
to authenticated
using (bucket_id = 'kaiser-documents')
with check (bucket_id = 'kaiser-documents');
