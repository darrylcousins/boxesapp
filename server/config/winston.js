/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import path from "path";
import winston from "winston";
import WinstonNodeMailer from "../src/mail/winston-mailer.js";
import "winston-mongodb";
import "dotenv/config";

const partsNZTime = (timestamp) => {
  // insist on NZ locale
  const d = new Date(timestamp).toLocaleString("en-NZ", {
    timeZone: "Pacific/Auckland",
    hour12: false
  });
  return d.split(',').map(el => el.trim());
};

const fileFormat = winston.format.printf(
  info => {
    const parts = partsNZTime(info.timestamp);
    `${new Date(parts[0]).toDateString()} ${parts[1]} - ${info.level}: ${info.message}`;
  }
);

const consoleFormat = winston.format.printf(
  info => {
    // return time only
    const parts = partsNZTime(info.timestamp);
    return `${parts[1]} - ${info.level}: ${info.message}`;
  }
);

const logLevels = {
    fatal: 0,
    error: 1,
    warn: 2,
    notice: 3,
    info: 4,
    debug: 5,
    trace: 6,
};

const winstonLogger = winston.createLogger({
  levels: logLevels,
  level: 'info',
  format: winston.format.timestamp(),
  transports: []
});

if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat,
      )
    })
  );
  /*
   * Not logging to file - handle by pm2
   */
};

// create a stream object with a 'write' function that will be used by `morgan`
winstonLogger.stream = {
  write: function(message, encoding) {
    // use the 'info' log level so the output will be picked up by both
    // transports (file and console) - though not using file
    winstonLogger.info(message);
  },
};

if (process.env.NODE_ENV !== 'test') {
  // why no credentials here
  const username = encodeURIComponent(process.env.DB_USER);
  const password = encodeURIComponent(process.env.DB_PASSWORD);

  const mongo_uri = `mongodb://${username}:${password}@localhost/${process.env.DB_NAME}`;
  const mongo_options = { useUnifiedTopology: true };

  // winstonLogger transport to log all actions on objects this is made available in
  // the app as globals._logger. Notice level used to log changes made to
  // objects.Error level logs try/catch errors. Warn level currently only for
  // api/bullmq 'errors'. Fatal not logged anywhere at the moment e.g. order
  // created, subscription created etc use 'meta' to add ids and similar
  winstonLogger.add(
    new winston.transports.MongoDB({
      level: "notice",
      db: mongo_uri,
      options: mongo_options,
      collection: 'logs',
      metaKey: 'meta'
    })
  );
  winstonLogger.add(
    new WinstonNodeMailer({
      level: "error",
    })
  );
};

// separate logger for console logging of requests using morgan
const morganLogger = winston.createLogger({
  level: 'info',
  format: winston.format.timestamp(),
  transports: []
});

morganLogger.add(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      consoleFormat,
    )
  })
);
// create a stream object with a 'write' function that will be used by `morgan`
morganLogger.stream = {
  write: function(message, encoding) {
    // use the 'info' log level so the output will be picked up by both transports (file and console)
    morganLogger.info(message.replace("\n", ""));
  },
};

export {
  winstonLogger,
  morganLogger,
  consoleFormat
};

