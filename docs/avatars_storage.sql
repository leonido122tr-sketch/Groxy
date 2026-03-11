-- Бакет для аватаров. В Supabase: Storage → New bucket → имя avatars, Public: включить.
-- Затем выполнить политики ниже (Storage → avatars → Policies → New policy или SQL Editor).
--
-- Политики storage.objects: загрузка/удаление только в папку с именем = auth.uid()
-- Чтение: все (бакет публичный)
create policy "avatars_select"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Загрузка/замена: только в папку с именем = auth.uid()
create policy "avatars_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "avatars_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "avatars_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
