-- Профили пользователей: имя и email для отображения автора в форуме.
-- Выполнить в Supabase SQL Editor.
--
-- ВАЖНО: В вашей БД таблица profiles уже создана с русскими именами колонок:
--   идентификатор (PK), отображаемое_имя, электронная_почта, аватар, телефон,
--   метаданные, создано_в, обновлено_в.
-- Приложение использует эти имена в запросах и upsert. Ниже — эталонная схема
-- на английском (если будете создавать таблицу заново) и опция VIEW с алиасами.

-- Таблица профилей (если создаёте с нуля; у вас уже есть с русскими именами)
-- create table if not exists public.profiles (
--   id uuid primary key references auth.users(id) on delete cascade,
--   display_name text,
--   email text,
--   updated_at timestamptz not null default now()
-- );

alter table public.profiles enable row level security;

-- Читать может любой (для отображения автора в карточках тем)
create policy "profiles_select" on public.profiles for select using (true);

-- Вставлять и обновлять только свой профиль
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

-- Представление: темы с полями автора (имя, email)
create or replace view public.forum_topics_with_author as
select
  t.id,
  t.category_id,
  t.user_id,
  t.title,
  t.content,
  t.pinned,
  t.views_count,
  t.replies_count,
  t.created_at,
  t.updated_at,
  p.display_name as author_display_name,
  p.email as author_email
from public.forum_topics t
left join public.profiles p on p.id = t.user_id;

-- Права на представление
grant select on public.forum_topics_with_author to anon;
grant select on public.forum_topics_with_author to authenticated;

-- Опционально: автоматическое создание профиля при регистрации (выполнять от имени service role или в Dashboard)
-- create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
-- begin
--   insert into public.profiles (id, email) values (new.id, new.email);
--   return new;
-- end;
-- $$;
-- create trigger on auth.users after insert for each row execute function public.handle_new_user();
