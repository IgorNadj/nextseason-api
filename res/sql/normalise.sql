DROP TABLE IF EXISTS show;
CREATE TABLE show (
	id INTEGER PRIMARY KEY ASC, 
	name TEXT, 
	year INTEGER
);
INSERT INTO show (
	name, 
	year
)
SELECT show_name, show_year
FROM release_date
GROUP BY show_name;



DROP TABLE IF EXISTS episode_and_season;
CREATE TABLE episode_and_season (
	id INTEGER PRIMARY KEY ASC, 
	show_id INTEGER, 
	name TEXT, 
	season_number INTEGER, 
	episode_number INTEGER, 
	release_date_raw TEXT, 
	release_date_timestamp INTEGER, 
	release_date_location TEXT,
	location_filmed TEXT
);
INSERT INTO episode_and_season (
	show_id, 
	name, 
	season_number,
	episode_number, 
	release_date_raw, 
	release_date_timestamp,
	release_date_location,
	location_filmed
) SELECT 
	show.id, 
	release_date.episode_name,
	release_date.season_number, 
	release_date.episode_number, 
	release_date.release_date_raw, 
	release_date.release_date_timestamp,
	release_date.release_date_location,
	release_date.location_filmed
FROM release_date 
LEFT JOIN show ON (release_date.show_name = show.name);



DROP TABLE IF EXISTS season;
CREATE TABLE season (
	id INTEGER PRIMARY KEY ASC,
	show_id INTEGER,
	number INTEGER
);
INSERT INTO season (
	show_id,
	number
) SELECT
	show_id,
	season_number
FROM episode_and_season
WHERE season_number IS NOT NULL 
GROUP BY show_id, season_number;



DROP TABLE IF EXISTS episode;
CREATE TABLE episode (
	id INTEGER PRIMARY KEY ASC, 
	show_id INTEGER, 
	season_id INTEGER,
	name TEXT, 
	number INTEGER, 
	release_date_raw TEXT, 
	release_date_timestamp INTEGER, 
	release_date_location TEXT,
	location_filmed TEXT
);
INSERT INTO episode (
	show_id, 
	season_id,
	name, 
	number, 
	release_date_raw, 
	release_date_timestamp,
	release_date_location,
	location_filmed
) SELECT 
	e.show_id, 
	season.id,
	e.name,
	e.episode_number, 
	e.release_date_raw, 
	e.release_date_timestamp,
	e.release_date_location,
	e.location_filmed
FROM episode_and_season e
LEFT JOIN season ON (e.show_id = season.show_id AND e.season_number = season.number);

DROP TABLE episode_and_season;



DROP VIEW IF EXISTS season_release;
CREATE VIEW season_release AS
SELECT
        season.id AS season_id,
        season.show_id,
        season.number AS season_number,
        e2.release_date_timestamp,
        e2.release_date_raw
FROM season
LEFT JOIN (
        SELECT season_id, min(number) AS min_episode_number
        FROM episode
        GROUP BY show_id, season_id
) e ON (season.id = e.season_id)
INNER JOIN (
        SELECT season_id, number, release_date_raw, release_date_timestamp
        FROM episode
) e2 ON (e.season_id = e2.season_id AND e.min_episode_number = e2.number);

DROP INDEX IF EXISTS season_release_release_date_timestamp_idx;
CREATE INDEX season_release_release_date_timestamp_idx ON season_release (release_date_timestamp);

DROP INDEX IF EXISTS idx_show_name;
CREATE INDEX idx_show_name ON show (name);
