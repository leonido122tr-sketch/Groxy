-- Бакет для фото форума (темы и комментарии).
-- В Supabase: Storage → New bucket → имя forum-images, Public: включить (если нужны публичные URL).
-- Затем выполнить политики ниже в SQL Editor.
--
-- Политики storage.objects: загрузка только в папку с именем = auth.uid() (путь: userId/файл.jpg)

create policy "forum_images_select"
  on storage.objects for select
  using (bucket_id = 'forum-images');

create policy "forum_images_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'forum-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "forum_images_update"
  on storage.objects for update
  using (
    bucket_id = 'forum-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "forum_images_delete"
  on storage.objects for delete
  using (
    bucket_id = 'forum-images'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
