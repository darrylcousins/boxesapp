#!/usr/bin/env bash

# make executable chmod +x logclean-cron.sh
# add to crontab, e.g. crontab -e  0 3 * * * /home/user/path/to/logclean-cron.sh
# which will run at 3 a.m. nightly

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

NODE="$( which node )"

cd $PARENT_DIR

$NODE -r dotenv/config $SCRIPT_DIR/pm2-monit.js

