-- Когда создатель темы редактирует тему, выставляем edited_at.
-- Выполнить в Supabase SQL Editor.

alter table public.forum_topics
  add column if not exists edited_at timestamptz;

comment on column public.forum_topics.edited_at is 'Дата и время последнего редактирования темы автором';
