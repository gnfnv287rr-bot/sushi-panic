-- Compatibility-only rollback; retain catalog, collections, sessions and all new columns.
-- First roll back Edge/frontend together. Old casual sessions require the V1.2 replay to settle.
alter function public.sushi_complete(uuid,uuid,text,bigint,integer,integer,jsonb) rename to sushi_complete_casual_saved;
alter function public.sushi_complete_archive(uuid,uuid,text,bigint,integer,integer,jsonb) rename to sushi_complete;
