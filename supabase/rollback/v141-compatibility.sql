-- Compatibility rollback retains taste columns/preferences and 1.4.1 validation.
-- Roll back Pages to ba65486 only after users settle 1.4.1 tables; retain upgraded Edge.
-- Never DROP taste columns or roll back the old-run transition validator: that would strand saved tables.
-- Disable only new starts when needed; keep all historical/active data readable.
begin;
revoke execute on function public.sushi_start_taste(uuid,uuid,bigint,text,text,boolean,jsonb) from service_role;
commit;
-- To resume, reapply 20261020110000_player_tastes.sql (idempotent).
