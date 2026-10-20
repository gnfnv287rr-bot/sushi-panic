select jsonb_build_object(
 'capturedAt',now(),
 'players',coalesce((select jsonb_agg(to_jsonb(t)) from sushi_players t),'[]'),
 'sessions',coalesce((select jsonb_agg(to_jsonb(t)) from sushi_game_sessions t),'[]'),
 'scores',coalesce((select jsonb_agg(to_jsonb(t)) from sushi_daily_scores t),'[]'),
 'champions',coalesce((select jsonb_agg(to_jsonb(t)) from sushi_daily_champions t),'[]'),
 'collection',coalesce((select jsonb_agg(to_jsonb(t)) from sushi_player_collection t),'[]'),
 'catalog',coalesce((select jsonb_agg(to_jsonb(t)) from sushi_catalog t),'[]'),
 'themes',coalesce((select jsonb_agg(to_jsonb(t)) from sushi_themes t),'[]')
) as snapshot;
