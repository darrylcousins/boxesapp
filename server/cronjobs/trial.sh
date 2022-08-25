#!/usr/bin/env bash

# make executable chmod +x backup-cron.sh
# add to crontab, e.g. crontab -e  0 3 * * * /home/user/path/to/backup-cron.sh
# which will run at 3 a.m. daily

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
NODE="$( which node )"

cd $SCRIPT_DIR

$NODE trial.js

