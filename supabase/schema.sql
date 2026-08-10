-- Run in Supabase SQL Editor to set up the schema

create table if not exists sessions (
  id         uuid primary key,
  filter     text not null default 'Normal',
  created_at timestamptz not null default now()
);

-- Storage bucket (run in Supabase dashboard or via CLI)
-- insert into storage.buckets (id, name, public) values ('wedding-clips', 'wedding-clips', true);
