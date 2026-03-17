# Проверка RLS-политик и безопасности

Сводка по таблицам с RLS и рекомендациям. Актуально после исправлений через Supabase Agent (feedback, forum_categories, search_path у функций).

---

## 1. Таблицы и политики (по репозиторию и применённым фиксам)

| Таблица | RLS | SELECT | INSERT | UPDATE | DELETE | Примечание |
|--------|-----|--------|--------|--------|--------|------------|
| **forum_categories** | ✓ | `true` (публично) | `false` (только service_role) | `false` | — | INSERT/UPDATE ограничены фиксом в `docs/sql/fix_forum_categories_insert_policy.sql` |
| **forum_topics** | ✓ | `true` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | OK |
| **forum_posts** | ✓ | `true` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | OK |
| **forum_topic_images** | ✓ | `true` | владелец темы | владелец темы | владелец темы | через EXISTS по topic.user_id |
| **forum_post_images** | ✓ | `true` | владелец поста | владелец поста | владелец поста | через EXISTS по post.user_id |
| **forum_notifications** | ✓ | `auth.uid() = user_id` | — (триггер) | `auth.uid() = user_id` | — | OK |
| **push_tokens** | ✓ | `auth.uid() = user_id` | `auth.uid() = user_id` | — | `auth.uid() = user_id` | OK |
| **profiles** | ✓ | `true` (публично) | `auth.uid() = идентификатор` | `auth.uid() = идентификатор` | — | OK |
| **user_projects** | ✓ | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | OK |
| **feedback** | ✓ | `false` | только **authenticated** и `user_id = auth.uid()` | `false` | `false` | Политика в БД: **feedback_allow_insert** (исправлено агентом). В репо в `support_feedback.sql` до сих пор описан старый вариант — фактически применён более строгий. |
| **cities** | ✓ | `true` (публично) | нет | нет | нет | Справочник, только чтение. OK |

---

## 2. Политики с «always true» (оставлены намеренно)

- **SELECT с `using (true)`**: forum_categories, forum_topics, forum_posts, forum_*_images, profiles, cities — публичное чтение для форума и справочников. Линтер их не трогает (исключение для SELECT).
- **INSERT/UPDATE с true** убраны: forum_categories (заменены на `false`), feedback (заменён на authenticated + user_id).

---

## 3. Функции и search_path

Для всех перечисленных ранее функций в `public` агент выполнил:

`ALTER FUNCTION ... SET search_path = public;`

В том числе: `is_profile_owner`, `user_projects_updated_at`, `create_or_get_conversation`, `forum_*`, `handle_new_user`, `increment_forum_topic_views`, `is_user_participant`, `normalize_name`, `search_cities`, `set_my_display_name`, `sync_display_name_from_rus`, `update_updated_at_column`.

Предупреждения про mutable search_path по ним закрыты.

---

## 4. Auth и прочее

- **Leaked password protection (HaveIBeenPwned)**: на Free-тарифе недоступна. Включить при переходе на Pro: Authentication → Providers → Email → Password → «Prevent leaked passwords».
- **Edge Function send-forum-push**: без секрета `FCM_SERVER_KEY` пуши на устройство не отправляются; список уведомлений в приложении работает.
- **Webhook** на Insert в `forum_notifications` создан и вызывает Edge Function.

---

## 5. Что проверить в Supabase (Dashboard / SQL)

1. **RLS включён** у всех таблиц, которые отдаются через PostgREST: в т.ч. `forum_notifications`, `push_tokens` (если линтер ругался — выполнить `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
2. **Политика feedback**: в БД должна быть одна политика на INSERT для `feedback` — **feedback_allow_insert**, `TO authenticated`, `WITH CHECK (user_id = auth.uid())`. Старую с `with check (true)` удалить, если осталась под другим именем.
3. **Политики forum_categories**: **forum_categories_insert** и **forum_categories_update** с `WITH CHECK (false)` / `USING (false)` (как в `docs/sql/fix_forum_categories_insert_policy.sql`).

---

## 6. Файлы в репозитории

| Файл | Назначение |
|------|------------|
| `docs/forum_schema.sql` | Форум: таблицы и RLS (категории/темы/посты/картинки). Для категорий INSERT/UPDATE потом ужесточены отдельным скриптом. |
| `docs/forum_notifications.sql` | Уведомления форума + push_tokens + триггер, RLS. |
| `docs/supabase_profiles.sql` | Профили, RLS, представление, set_my_display_name. |
| `docs/user_projects.sql` | Проекты пользователей, RLS. |
| `docs/support_feedback.sql` | Таблица feedback. **Внимание:** фактическая политика INSERT в БД строже (authenticated + user_id); в файле описан старый вариант. |
| `docs/cities_rls.sql` | RLS для cities (публичное чтение). |
| `docs/sql/fix_forum_categories_insert_policy.sql` | Ужесточение INSERT/UPDATE для forum_categories. |
| `docs/avatars_storage.sql` | Политики Storage для бакета avatars. |

При расхождении между репо и реальной БД ориентироваться на то, что применено в Supabase (в т.ч. через агента).
