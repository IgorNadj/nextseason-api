# nextseason API

## Overview

Downloads, parses and makes available through an http API the release dates of upcoming TV seasons.

Components:
- update - connects to the imdb ftp servers and downloads the release_dates.list file
- parse - parses the .list file and outputs into a sqlite database
- serve - reads a sqlite database and serves the data over http

## Install

npm install

## Usage

  node ./index.js

