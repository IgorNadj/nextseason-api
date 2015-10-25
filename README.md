# nextseason API

## Overview

Downloads, parses and makes available through an http API the release dates of upcoming TV seasons.

Actions:
- update - connects to the imdb ftp servers and downloads the release_dates.list file
- parse - parses the .list file and outputs into a sqlite database
- normalise - creates normalised tables and views in the database
- serve - reads a sqlite database and serves the data over http

## Install

npm install

## Usage

  node ./index.js

For a fresh install, you will want to follow the order of actions as above.
