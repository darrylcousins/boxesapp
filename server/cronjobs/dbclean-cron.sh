#!/usr/bin/env bash

# make executable chmod +x dbclean-cron.sh
# add to crontab, e.g. crontab -e  0 3 * * 0 /home/user/path/to/dbclean-cron.sh
# which will run at 3 a.m. Sunday

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
NODE="$( which node )"

cd $SCRIPT_DIR

$NODE dbclean.js