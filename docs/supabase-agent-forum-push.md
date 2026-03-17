# Задание для Supabase AI Agent: пуш-уведомления форума

## Контекст

В приложении реализованы уведомления форума: когда в теме оставляют комментарий, автор темы получает запись в таблице `forum_notifications`. Список показывается в приложении (иконка колокольчика в шапке). Нужно добавить **отправку push-уведомлений на устройство** через FCM, если у пользователя включена настройка.

## 1. Убедиться, что SQL выполнен

В проекте есть скрипт **`docs/forum_notifications.sql`**. Нужно выполнить его в Supabase SQL Editor (если ещё не выполнялся). В нём:

- Таблица **`forum_notifications`** (id, user_id, topic_id, post_id, created_at, read), RLS.
- Триггер **`forum_posts_notify_author`** на `forum_posts` AFTER INSERT — создаёт запись в `forum_notifications` для автора темы (если комментарий написал не он).
- В **`profiles`** колонка **`push_notifications_enabled`** (boolean, default true).
- Таблица **`push_tokens`** (id, user_id, token, platform, created_at), RLS — сюда приложение сохраняет FCM-токены устройств.

Проверь в Dashboard: таблицы и триггер есть, в `profiles` есть колонка `push_notifications_enabled`.

---

## 2. Отправка push при новом уведомлении

Нужно: **при появлении новой строки в `forum_notifications`** отправлять push на все устройства пользователя через FCM, **только если** у этого пользователя `profiles.push_notifications_enabled = true`.

### Варианты реализации в Supabase

**Вариант A — Database Webhook + Edge Function (рекомендуется)**  
1. В Supabase Dashboard: Database → Webhooks → Create a new hook.  
2. Событие: **Insert** на таблице **`forum_notifications`**.  
3. URL: твоя Edge Function (например `https://<project_ref>.supabase.co/functions/v1/send-forum-push`).  
4. Edge Function делает:
   - Получает payload с новыми полями строки (например `record.id`, `record.user_id`, `record.topic_id`, `record.post_id`).
   - По `user_id` проверяет `profiles.push_notifications_enabled`; если `false` — выходим без отправки.
   - По `user_id` выбирает из `push_tokens` все строки (поле `token`).
   - Опционально: по `topic_id` можно достать заголовок темы из `forum_topics` для текста пуша.
   - Для каждого токена вызывает FCM HTTP v1 API (или legacy HTTP) с телом вида: заголовок «Новый комментарий в теме», тело «В теме "…" новый комментарий» (или ссылка на тему).

**Вариант B — Триггер + `pg_net`**  
Если используешь `pg_net`: в триггере AFTER INSERT на `forum_notifications` вызывать `net.http_post` на Edge Function с нужными параметрами. Тогда логика «проверить profiles и отправить FCM» остаётся в Edge Function.

### Что должна делать Edge Function

- **Вход**: данные о новой записи `forum_notifications` (user_id, topic_id, post_id; при желании id).
- **Шаги**:
  1. Supabase client с service role (или с ключом с правами на чтение `profiles` и `push_tokens`).
  2. Проверить `profiles.push_notifications_enabled` для этого `user_id`. Если `false` — `return new Response(JSON.stringify({ ok: true, skipped: 'disabled' }), ...)`.
  3. Выбрать из `push_tokens` все `token` для этого `user_id`.
  4. Если токенов нет — выйти с `{ ok: true, skipped: 'no_tokens' }`.
  5. Опционально: один запрос к `forum_topics` по `topic_id` взять `title` для текста пуша.
  6. Для каждого токена отправить запрос в FCM (см. ниже). Использовать **секрет** (FCM server key или path to service account JSON) из Supabase Edge Function secrets, не хранить в коде.
- **Ответ**: 200 и JSON с результатом (сколько отправлено, сколько пропущено).

### FCM

- В Firebase Console: Project → Project settings → Cloud Messaging — получить **Server key** (legacy) или настроить **FCM HTTP v1** (OAuth2 + service account). Для v1 нужен JSON сервисного аккаунта; его можно положить в Supabase Secrets и в Edge Function читать для получения access token.
- Формат запроса к FCM:  
  - Legacy: `POST https://fcm.googleapis.com/fcm/send`, заголовки `Authorization: key=<SERVER_KEY>`, `Content-Type: application/json`, тело `{ "to": "<token>", "notification": { "title": "...", "body": "..." }, "data": { "topic_id": "...", "url": "/forum/..." } }`.  
  - v1: endpoint `https://fcm.googleapis.com/v1/projects/<project_id>/messages:send`, тело `{ "message": { "token": "<token>", "notification": { "title": "...", "body": "..." }, "data": { ... } } }`, авторизация Bearer &lt;access_token&gt;.

### Секреты Edge Function

- Для FCM: например `FCM_SERVER_KEY` (legacy) или `FCM_SERVICE_ACCOUNT_JSON` (строка JSON для v1). Задать в Supabase Dashboard → Edge Functions → Secrets (или через CLI).

---

## 3. Итоговый чек-лист для агента

1. Убедиться, что **`docs/forum_notifications.sql`** применён (таблицы, триггер, колонка в `profiles`, `push_tokens`).
2. Создать **Edge Function** (например `send-forum-push`), которая:
   - принимает payload о новой записи в `forum_notifications`;
   - проверяет `profiles.push_notifications_enabled` для `user_id`;
   - читает токены из `push_tokens` для этого `user_id`;
   - при необходимости подтягивает заголовок темы из `forum_topics`;
   - отправляет push через FCM на каждый токен;
   - использует секреты для FCM, не хардкод ключей.
3. Создать **Database Webhook** на Insert в `forum_notifications`, который вызывает эту Edge Function (или реализовать вызов через триггер + `pg_net`, если так принято в проекте).
4. В документации или в коде приложения кратко описать, какие секреты задать (например `FCM_SERVER_KEY` или `FCM_SERVICE_ACCOUNT_JSON`) и как включить FCM в Firebase для проекта.

После этого приложение остаётся только регистрировать FCM-токен при логине и сохранять его в `push_tokens`; при новом комментарии триггер создаёт запись в `forum_notifications`, webhook вызывает Edge Function, и пользователь получает пуш на устройство, если у него включены уведомления.

---

## Прямое задание для Supabase AI Agent (выполни по шагам)

Сделай всё необходимое в этом проекте Supabase для пуш-уведомлений форума:

1. **SQL**  
   Выполни в SQL Editor скрипт из репозитория: **`docs/forum_notifications.sql`** (полный текст скрипта см. в файле в корне репозитория). Если таблицы/триггер/колонка уже есть — скрипт идемпотентен, просто выполни его. Должны появиться или уже быть: таблица `forum_notifications`, триггер `forum_posts_notify_author` на `forum_posts`, колонка `profiles.push_notifications_enabled`, таблица `push_tokens` с RLS.

2. **Edge Function `send-forum-push`**  
   Создай и задеплой Edge Function с именем **send-forum-push**, которая:
   - принимает POST с телом Database Webhook (в теле приходит новая запись: `record` или `new` с полями `id`, `user_id`, `topic_id`, `post_id`);
   - через Supabase client с service role читает `profiles.push_notifications_enabled` для `record.user_id`; если `false` — возвращает 200 и `{ ok: true, skipped: "disabled_in_profile" }`;
   - читает из `push_tokens` все строки с этим `user_id`;
   - опционально подтягивает `forum_topics.title` по `topic_id` для текста пуша;
   - для каждого токена отправляет POST на `https://fcm.googleapis.com/fcm/send` с заголовком `Authorization: key=<FCM_SERVER_KEY>`, телом `{ "to": "<token>", "notification": { "title": "Новый комментарий в теме", "body": "..." }, "data": { "topic_id": "...", "post_id": "...", "notification_id": "..." } }`;
   - ключ FCM брать из переменной окружения/секрета **`FCM_SERVER_KEY`** (legacy server key из Firebase).
   Используй Deno и `npm:@supabase/supabase-js`. Код функции ты уже давал в предыдущем ответе — возьми его за основу и задеплой.

3. **Секрет**  
   Добавь в проект секрет Edge Functions: имя **`FCM_SERVER_KEY`**. Значение пользователь подставит сам в Dashboard (Firebase → Project settings → Cloud Messaging → Server key). Дай в ответе явную инструкцию: «В Dashboard → Edge Functions → Secrets добавь ключ FCM_SERVER_KEY и вставь туда legacy Server key из Firebase».

4. **Database Webhook**  
   Создай webhook в Database → Webhooks:
   - событие: **Insert** на таблице **`forum_notifications`** (schema public);
   - URL: **`https://<project_ref>.supabase.co/functions/v1/send-forum-push`** (подставь реальный project-ref проекта);
   - метод: **POST**.

По завершении напиши, что сделано (SQL выполнен / функция задеплоена / webhook создан), и напомни пользователю один раз добавить секрет **FCM_SERVER_KEY** вручную в Dashboard со значением из Firebase.
