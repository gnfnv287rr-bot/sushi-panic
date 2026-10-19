-- Roll back clients/Edge together; retain all archive columns/records.
alter function public.sushi_complete(uuid,uuid,text,bigint,integer,integer,jsonb) rename to sushi_complete_optional_saved;
alter function public.sushi_complete_ranked(uuid,uuid,text,bigint,integer,integer,jsonb) rename to sushi_complete;
