-- Удаление своего аккаунта из приложения.
-- Профиль, фото, проекты на сервере и сообщения форума уходят вместе с аккаунтом
-- за счёт связей с auth.users и явного удаления профиля и файлов.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from storage.objects
  where name like uid::text || '/%';

  delete from public.profiles
  where идентификатор = uid;

  begin
    delete from public.push_tokens where user_id = uid;
  exception
    when undefined_table or undefined_column then
      null;
  end;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
