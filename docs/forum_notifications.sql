-- Уведомления форума: автор темы получает запись при новом комментарии.
-- Выполнить в Supabase SQL Editor после forum_schema.sql.

-- Таблица уведомлений (только комментарии в своих темах)
create table if not exists forum_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references forum_topics(id) on delete cascade,
  post_id uuid not null references forum_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

create index if not exists forum_notifications_user_id on forum_notifications(user_id);
create index if not exists forum_notifications_user_unread on forum_notifications(user_id, read) where read = false;

alter table forum_notifications enable row level security;

create policy "forum_notifications_select_own"
  on forum_notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "forum_notifications_update_own"
  on forum_notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Триггер: при вставке поста создаём уведомление автору темы (если это не он сам)
create or replace function forum_notify_topic_author()
returns trigger as $$
declare
  topic_author_id uuid;
begin
  select user_id into topic_author_id from forum_topics where id = new.topic_id;
  if topic_author_id is not null and topic_author_id != new.user_id then
    insert into forum_notifications (user_id, topic_id, post_id)
    values (topic_author_id, new.topic_id, new.id);
  end if;
  return new;
end;
$$ language plpgsql security definer
set search_path = public;

drop trigger if exists forum_posts_notify_author on forum_posts;
create trigger forum_posts_notify_author
  after insert on forum_posts
  for each row execute function forum_notify_topic_author();

-- Профиль: настройка «пуши на устройство» (добавить колонку, если ещё нет)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'push_notifications_enabled'
  ) then
    alter table public.profiles add column push_notifications_enabled boolean not null default true;
  end if;
end $$;

-- Токены устройств для push (FCM)
create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null default 'android',
  created_at timestamptz not null default now(),
  unique(user_id, token)
);

create index if not exists push_tokens_user_id on push_tokens(user_id);

alter table push_tokens enable row level security;

create policy "push_tokens_select_own" on push_tokens for select to authenticated using (auth.uid() = user_id);
create policy "push_tokens_insert_own" on push_tokens for insert to authenticated with check (auth.uid() = user_id);
create policy "push_tokens_delete_own" on push_tokens for delete to authenticated using (auth.uid() = user_id);
