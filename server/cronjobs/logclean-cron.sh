#!/usr/bin/env bash

# make executable chmod +x logclean-cron.sh
# add to crontab, e.g. crontab -e  0 3 * * * /home/user/path/to/logclean-cron.sh
# which will run at 3 a.m. nightly

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
NODE="$( which node )"

cd $SCRIPT_DIR

$NODE logclean.js
