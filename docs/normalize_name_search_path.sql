-- Fix: Function public.normalize_name has a role mutable search_path.
-- Set an explicit search_path so the function is not affected by the caller's search_path.
--
-- If the function has a different signature, check in Supabase:
--   SELECT proname, pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname = 'normalize_name';
-- then use: ALTER FUNCTION public.normalize_name(<args>) SET search_path = public;

alter function public.normalize_name(text) set search_path = public;
