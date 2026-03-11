# Настройка Storage для загрузки фото в форум

## Напоминание: что сделано в приложении

- **Бакет:** `forum-images`
- **Путь загрузки:** `{user_id}/{timestamp}-{sanitized_filename}.jpg`  
  Пример: `53121a14-611f-4ad0-b095-871103d042a6/1772897416839-photo_2026-03-05_15-56-58.jpg`
- Файл перед загрузкой сжимается на клиенте (до ~1 МБ, макс. 1200 px), исходный файл не более 5 МБ.
- После загрузки приложение получает **публичный URL** через `getPublicUrl(path)` и вставляет его в контент темы/ответа. Значит, бакет должен быть **публичным** (Public), чтобы картинки открывались по ссылке без авторизации.
- Код загрузки: `lib/forum/uploadForumImage.ts`, вызов из `app/forum/components/ForumImageUpload.tsx`.

Если бакет не создан или нет политик, Supabase возвращает **400 Bad Request** на `POST .../storage/v1/object/forum-images/{user_id}/{filename}.jpg`.

---

## Что сделать в Supabase

### 1. Проверить или создать бакет

1. Открой **Supabase Dashboard** → **Storage**.
2. Проверь, есть ли бакет с именем **`forum-images`** (точно так, без пробелов).
3. Если бакета нет — нажми **New bucket**:
   - **Name:** `forum-images`
   - **Public bucket:** включить (чтобы картинки были доступны по публичной ссылке).
   - Сохранить.

### 2. Политики (Policies) для бакета `forum-images`

Нужны две политики.

#### 2.1. INSERT (загрузка) — только в свою папку

- **Policy name:** например `forum-images-upload`
- **Allowed operation:** INSERT (upload)
- **Target roles:** `authenticated`
- **USING expression:** не нужна для INSERT
- **WITH CHECK expression:**

```sql
(bucket_id = 'forum-images' AND (storage.foldername(name))[1] = auth.uid()::text)
```

Так пользователь может загружать файлы только в папку, имя которой совпадает с его `auth.uid()` (например `53121a14-611f-4ad0-b095-871103d042a6`).

В интерфейсе Storage → Policies → New policy:
- Выбери **For full customization** (или аналог с ручным SQL).
- Для INSERT укажи **WITH CHECK:**  
  `(bucket_id = 'forum-images' AND (storage.foldername(name))[1] = auth.uid()::text)`

#### 2.2. SELECT (чтение) — для публичного доступа к картинкам

Если бакет публичный, чтение часто разрешено по умолчанию. Если нужна явная политика:

- **Policy name:** например `forum-images-read`
- **Allowed operation:** SELECT
- **Target roles:** `anon`, `authenticated` (или только `anon`, если картинки должны быть доступны всем)
- **USING expression:**

```sql
bucket_id = 'forum-images'
```

Так любой (в т.ч. неавторизованный) сможет открывать картинки по публичной ссылке.

### 3. Через SQL (альтернатива)

В **SQL Editor** можно создать политики так:

```sql
-- Политика загрузки: только в свою папку {user_id}
CREATE POLICY "forum-images-upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'forum-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Политика чтения: все могут читать файлы в forum-images
CREATE POLICY "forum-images-read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'forum-images');
```

Бакет при этом нужно создать вручную в разделе Storage (через UI), если его ещё нет.

---

## 400 vs 403 в Storage

- **403 Forbidden** — обычно при отказе по RLS (нет политики или условие не выполняется).
- **400 Bad Request** — часто при:
  - отсутствии бакета (неверное имя или бакет не создан);
  - неверном формате пути/имени файла;
  - неверных заголовках/теле запроса.

Если после создания бакета `forum-images` и политик загрузки по-прежнему 400, проверь в логах Supabase (Dashboard → Logs → Storage), что именно возвращает API. Дополнительно убедись, что в приложении не меняется имя бакета и путь строится как `{user_id}/{timestamp}-{name}.jpg` (как в `lib/forum/uploadForumImage.ts`).

---

## Краткий чеклист

- [ ] В Storage есть бакет **forum-images**
- [ ] Бакет **Public** (для публичных ссылок на картинки)
- [ ] Политика **INSERT** для `authenticated` с условием «путь начинается с `auth.uid()::text`»
- [ ] Политика **SELECT** для чтения (например, для `public` или `anon`/`authenticated`)
- [ ] После этого повторить загрузку фото в форуме — ожидается успешный ответ без 400
