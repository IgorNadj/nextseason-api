DROP TABLE IF EXISTS show;
CREATE TABLE show (
	id INTEGER PRIMARY KEY ASC, 
	name TEXT, 
	year INTEGER,
	extra_show_id INTEGER
);
INSERT INTO show (
	name, 
	year,
	extra_show_id
)
SELECT show_name, show_year, extra_show_id
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



DROP VIEW IF EXISTS season_location_release;
CREATE VIEW season_location_release AS
SELECT
    season.id AS season_id,
    season.show_id,
    season.number AS season_number,
    e2.release_date_timestamp,
    e2.release_date_raw,
    e2.release_date_location
FROM season
INNER JOIN (
    SELECT season_id, min(number) AS min_episode_number
    FROM episode
    GROUP BY show_id, season_id
) e ON (season.id = e.season_id)
INNER JOIN episode e2 ON (e.season_id = e2.season_id AND e.min_episode_number = e2.number);



DROP VIEW IF EXISTS season_earliest_future_release;
CREATE VIEW season_earliest_future_release AS
SELECT
	season.id as season_id,
	season.show_id,
	season.number as season_number,
	sr.earliest_release_date_timestamp
FROM season
INNER JOIN (
	SELECT season_id, min(release_date_timestamp) AS earliest_release_date_timestamp 
	FROM season_location_release 
	GROUP BY season_id
) sr ON (season.id = sr.season_id)
WHERE sr.earliest_release_date_timestamp > CAST(strftime('%s', 'now') AS INTEGER);




DROP VIEW IF EXISTS season_next_release;
CREATE VIEW season_next_release AS 
SELECT
	sefr.season_id,
	sefr.show_id,
	sefr.season_number,
	sefr.earliest_release_date_timestamp 
FROM season_earliest_future_release sefr
INNER JOIN (
	SELECT season_id, MIN(season_number) as min_season_number
	FROM season_earliest_future_release 
	GROUP BY show_id
) sefr2 ON (sefr.season_id = sefr2.season_id AND sefr.season_number = sefr2.min_season_number);



DROP VIEW IF EXISTS show_next_season;
CREATE VIEW show_next_season AS
SELECT
	s.id as show_id,
	s.extra_show_id AS tmdbId, 
	s.name, 
	s.year, 
	snr.season_number, 
	snr.earliest_release_date_timestamp
FROM show s 
INNER JOIN season_next_release snr ON (s.id = snr.show_id);