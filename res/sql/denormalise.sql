DROP TABLE IF EXISTS upcoming_season_denorm;
CREATE TABLE upcoming_season_denorm AS
SELECT show.id AS show_id, show.name AS show_name, season_number, release_date_raw, release_date_timestamp, tmdb_id, tmdb_poster_path, tmdb_popularity 
FROM season_release 
LEFT JOIN show ON (show.id = season_release.show_id) 
LEFT JOIN show_extra ON (show.id = show_extra.show_id) 
WHERE season_release.season_number > 1;

DROP INDEX IF EXISTS idx_denorm_show_id;
CREATE INDEX idx_denorm_show_id ON upcoming_season_denorm (show_id);