-- Support / Feedback: храним обращения без авторизации.
-- Выполнить в Supabase SQL Editor.

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic text not null,
  message text not null,
  contact text,
  user_id uuid references auth.users(id) on delete set null
);

create index if not exists feedback_created_at on feedback(created_at desc);

alter table feedback enable row level security;

-- Разрешаем вставку всем (anon и authenticated)
create policy "feedback_insert"
  on feedback for insert
  with check (true);

-- Чтение запрещено через anon key (админ смотрит через dashboard / service role)
create policy "feedback_no_select"
  on feedback for select
  using (false);

-- Обновление и удаление запрещены
create policy "feedback_no_update"
  on feedback for update
  using (false);

create policy "feedback_no_delete"
  on feedback for delete
  using (false);
