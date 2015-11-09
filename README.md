# nextseason API

## Overview

Downloads, parses and makes available through an http API the release dates of upcoming TV seasons.

Actions:

- Run once:
-- download - connects to the imdb ftp servers and downloads the release_dates.list file, and converts to utf8
-- parse - parses the .list file and outputs into a sqlite database
-- normalise - creates normalised tables and views in the database
-- extra - adds extra show data from themoviedb.org
-- denormalise - cache upcoming series in a denormalised table
-- serve - reads the sqlite database and serves the data over http

- Then run on a schedule:
-- update - checks for newer list file and updates db with changes. Note: this updates to the point of normailse, you still need to run extra and denormalise (alternatively run the update.sh script in res/scripts). Limitations: update only updates existing episodes (as best as it can) and adds new ones. This is not perfect, you may need to do a full re-parse once in a while.



## Install

npm install

## Usage

  node ./index.js

For a fresh install, you will want to follow the order of actions listed above.
