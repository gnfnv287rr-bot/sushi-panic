begin;
do $$ begin if exists(select 1 from public.sushi_game_sessions where rules_version='1.2.1' and status='playing') then raise exception 'Open 1.2.1 sessions exist: keep the compatible backend; rollback frontend only'; end if; end $$;
-- Keep all catalog/discovery data. Roll client and Edge back together; retain new replay for opened 1.2.1 sessions.
alter function public.sushi_complete(uuid,uuid,text,bigint,integer,integer,jsonb) rename to sushi_complete_catalog_saved;
alter function public.sushi_complete_before_catalog(uuid,uuid,text,bigint,integer,integer,jsonb) rename to sushi_complete;
-- Never run this SQL while 1.2.1 sessions remain open; prefer client-only rollback with the new compatible backend retained.

commit;
