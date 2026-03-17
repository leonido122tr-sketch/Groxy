-- Проекты пользователей (фундамент/стены/крыша). Только данные, без PDF.
-- Выполнить в Supabase SQL Editor.

create table if not exists public.user_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('walls_2', 'walls_3', 'walls_4')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_projects_user_id on public.user_projects(user_id);
create index if not exists user_projects_updated_at on public.user_projects(updated_at desc);

alter table public.user_projects enable row level security;

create policy "user_projects_select"
  on public.user_projects for select
  using (auth.uid() = user_id);

create policy "user_projects_insert"
  on public.user_projects for insert
  with check (auth.uid() = user_id);

create policy "user_projects_update"
  on public.user_projects for update
  using (auth.uid() = user_id);

create policy "user_projects_delete"
  on public.user_projects for delete
  using (auth.uid() = user_id);

comment on table public.user_projects is 'Проекты расчётов (фундамент/стены/крыша). PDF не хранится — генерируется на устройстве.';
