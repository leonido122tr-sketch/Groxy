-- Добавить индексы к public.user_projects (если таблица уже создана без них).
-- Выполнить в Supabase SQL Editor.

create index if not exists user_projects_user_id on public.user_projects(user_id);
create index if not exists user_projects_updated_at on public.user_projects(updated_at desc);
