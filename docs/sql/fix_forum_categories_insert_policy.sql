-- Устраняет предупреждения: RLS policy forum_categories (INSERT/UPDATE с true).
-- Категории в приложении не создаются и не редактируются пользователями, только чтение.
-- INSERT/UPDATE возможны только через service_role (Dashboard SQL, миграции, Edge Function).

DROP POLICY IF EXISTS forum_categories_insert ON public.forum_categories;

CREATE POLICY forum_categories_insert
ON public.forum_categories
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS forum_categories_update ON public.forum_categories;

CREATE POLICY forum_categories_update
ON public.forum_categories
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);
