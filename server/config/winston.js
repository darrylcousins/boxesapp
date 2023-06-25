import path from "path";
import winston from "winston";
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

const logger = winston.createLogger({
  levels: logLevels,
  level: 'info',
  format: winston.format.timestamp(),
  transports: []
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat,
      )
    })
  );
  /*
   * Not logging to file
   */
  /*
  } else {
    logger.add(
      new winston.transports.File({
        filename: path.resolve('logs/app.log'),
        format: fileFormat,
      })
    );
  */
};

// create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
  write: function(message, encoding) {
    // use the 'info' log level so the output will be picked up by both
    // transports (file and console) - though not using file
    logger.info(message);
  },
};

if (process.env.NODE_ENV !== 'test') {
  const mongo_uri = `mongodb://localhost/${process.env.DB_NAME}`;
  //const mongo_options = { useNewUrlParser: true, useUnifiedTopology: true };
  const mongo_options = { useUnifiedTopology: true };

  // logger transport to log all actions on objects
  // this is made available in the app as globals._logger
  // notice level used to log changes made to objects
  // error level logs try/catch errors
  // warn level currently only for api/bullmq 'errors'
  // fatal not logged anywhere at the moment
  // e.g. order created, subscription created etc
  // use 'metadata' to add ids and similar
  logger.add(
    new winston.transports.MongoDB({
      level: "notice",
      db: mongo_uri,
      options: mongo_options,
      collection: 'logs',
      metaKey: 'meta'
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
  logger as winstonLogger,
  morganLogger,
  consoleFormat
};

