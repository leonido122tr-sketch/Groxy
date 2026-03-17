-- Профили пользователей: имя и email для отображения автора в форуме.
-- Выполнить в Supabase SQL Editor.
--
-- ВАЖНО: В этой БД таблица profiles использует РУССКИЕ имена колонок.
-- PK и колонка пользователя — ИДЕНТИФИКАТОР (не id). Все RLS и триггеры
-- должны использовать идентификатор. См. docs/SUPABASE_SCHEMA.md.
--
-- Колонки: идентификатор (PK), отображаемое_имя, электронная_почта, аватар,
-- город, телефон, метаданные, создано_в, обновлено_в.
--
-- Добавить колонку город (если ещё нет):
-- alter table public.profiles add column if not exists город text;

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

-- Вставлять и обновлять только свой профиль (колонка — идентификатор)
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = идентификатор);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = идентификатор);

-- Представление: темы с полями автора (имя, email). profiles — русские колонки.
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
  p.отображаемое_имя as author_display_name,
  p.электронная_почта as author_email
from public.forum_topics t
left join public.profiles p on p.идентификатор = t.user_id;

-- Права на представление
grant select on public.forum_topics_with_author to anon;
grant select on public.forum_topics_with_author to authenticated;

-- RPC: установка отображаемого имени для текущего пользователя (обход проблемы с кириллицей в JSON от клиента)
create or replace function public.set_my_display_name(p_name text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.profiles
  set отображаемое_имя = nullif(trim(p_name), ''),
      обновлено_в = now()
  where идентификатор = auth.uid();
end;
$$;
grant execute on function public.set_my_display_name(text) to authenticated;

-- Опционально: автоматическое создание профиля при регистрации (колонки — русские имена)
-- create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
-- begin
--   insert into public.profiles (идентификатор, электронная_почта, обновлено_в) values (new.id, new.email, now())
--   on conflict (идентификатор) do update set электронная_почта = excluded.электронная_почта, обновлено_в = now();
--   return new;
-- end;
-- $$;
-- create trigger on_auth_user_created on auth.users after insert for each row execute function public.handle_new_user();
