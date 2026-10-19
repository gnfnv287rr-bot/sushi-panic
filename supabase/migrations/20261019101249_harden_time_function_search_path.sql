-- Added after live Supabase advisors. Fixed catalog path prevents name shadowing.
alter function public.sushi_now() set search_path = pg_catalog;
alter function public.sushi_day(timestamptz) set search_path = pg_catalog;
