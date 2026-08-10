-- Run in Supabase SQL Editor to set up the schema

create table if not exists sessions (
  id         uuid primary key,
  filter     text not null default 'Normal',
  created_at timestamptz not null default now()
);

alter table sessions enable row level security;

drop policy if exists "Guests can create sessions" on sessions;
create policy "Guests can create sessions"
on sessions for insert
to anon
with check (true);

drop policy if exists "Anyone can read sessions" on sessions;
create policy "Anyone can read sessions"
on sessions for select
to anon
using (true);

insert into storage.buckets (id, name, public)
values ('wedding-clips', 'wedding-clips', true)
on conflict (id) do update set public = true;

drop policy if exists "Guests can upload wedding clips" on storage.objects;
create policy "Guests can upload wedding clips"
on storage.objects for insert
to anon
with check (bucket_id = 'wedding-clips');

drop policy if exists "Anyone can read wedding clips" on storage.objects;
create policy "Anyone can read wedding clips"
on storage.objects for select
to anon
using (bucket_id = 'wedding-clips');
