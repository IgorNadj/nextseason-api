# nextseason API

## Overview

Downloads, parses and makes available through an http API the release dates of upcoming TV seasons.

Components:
- [updater](updater) - connects to the imdb ftp servers and downloads the release_dates.list file.
- [parser](parser) - parses the .list file and outputs into a sqlite database
- [server](server) - reads a sqlite database and serves the data over http