# send-forum-push

Edge Function: при Insert в `forum_notifications` отправляет FCM push на устройства пользователя (если у него включены уведомления в профиле).

## Деплой вручную

1. Установи [Supabase CLI](https://supabase.com/docs/guides/cli) и выполни `supabase login`.
2. В корне проекта: `supabase link --project-ref <твой_project_ref>`.
3. Добавь секрет: `supabase secrets set FCM_SERVER_KEY="<legacy Server key из Firebase>"`.
4. Деплой: `supabase functions deploy send-forum-push`.

## Database Webhook

В Dashboard → Database → Webhooks создай hook:

- **Table:** `forum_notifications`
- **Event:** Insert
- **URL:** `https://<project_ref>.supabase.co/functions/v1/send-forum-push`
- **Method:** POST
