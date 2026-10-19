-- Operator-only compatibility rollback. Retains ALL new archive data and columns.
-- Deploy previous API adapter along with this rollback. Do not run as a forward migration.
begin;
alter function public.sushi_profile(uuid,text) rename to sushi_profile_v12_paused;
alter function public.sushi_profile_v1(uuid,text) rename to sushi_profile;
alter function public.sushi_complete(uuid,uuid,text,bigint,integer,integer,jsonb) rename to sushi_complete_v12_paused;
alter function public.sushi_complete_v1(uuid,uuid,text,bigint,integer,integer) rename to sushi_complete;
commit;
