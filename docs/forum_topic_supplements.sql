-- Дополнения к теме: автор может добавлять блоки "Дополнено (дата)", не редактируя основной текст.
-- Выполнить в Supabase SQL Editor после forum_schema.sql.

create table if not exists forum_topic_supplements (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references forum_topics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists forum_topic_supplements_topic_id on forum_topic_supplements(topic_id);
create index if not exists forum_topic_supplements_created_at on forum_topic_supplements(topic_id, created_at asc);

alter table forum_topic_supplements enable row level security;

create policy "forum_topic_supplements_read" on forum_topic_supplements for select using (true);
create policy "forum_topic_supplements_insert" on forum_topic_supplements for insert with check (auth.uid() = user_id);
