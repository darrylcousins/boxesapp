/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import express from "express";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import morgan from "morgan";
import { readFileSync } from "fs";
import { resolve } from "path";

import { morganLogger, winstonLogger, consoleFormat } from "./../config/winston.js"
import { getMongoConnection, MongoStore } from "./lib/mongo.js";
import getDevServer from "./lib/dev-server.js";

import "dotenv/config";

// make logger and env available globally - only in middleware, webhooks etc
global._logger = winstonLogger;
// creates mongo connection and make collections available on app.locals
global._mongodb = await getMongoConnection();
// usage: _logger(`{_filename(import.meta)} my log message`);
global._filename = (_meta) => _meta.url.split("/").pop();

/* store registered webhooks */
const RechargeStore = new MongoStore({
  mongodb: _mongodb,
  collection: "registry"
});

/* store oauth tokens */
const ShopifyStore = new MongoStore({
  mongodb: _mongodb,
  collection: "sessions"
});

const PROD_INDEX_PATH = `${process.cwd()}/dist/client/src/assets`;
const DEV_INDEX_PATH = `${process.cwd()}/src/assets`;

async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === "production"
) {
  const app = express();

  morgan.token('host', function(req, res) {
    return req.hostname;
  });
  const morganTokens = ':method :host :url :status :res[content-length] - :response-time ms';
  app.use(morgan(morganTokens, { stream: morganLogger.stream })); // simple

  // set headers
  app.set('trust proxy', 1);

  let vite;

  if (isProd) {
    const compression = await import("compression").then(
      ({ default: fn }) => fn
    );
    const serveStatic = await import("serve-static").then(
      ({ default: fn }) => fn
    );
    app.use(compression());
    app.use(serveStatic(resolve("dist/client/assets"), { index: false}));
  } else {
    vite = await getDevServer({ app, root });
    app.use(vite.middlewares);
  };

  app.use("/", (req, res, next) => {
    // will need to get more clever with this to account for the proxied liquid files
    const url = req.url === "/" ? "index" : req.url;
    const path = isProd ? PROD_INDEX_PATH : DEV_INDEX_PATH;
    let buffer;
    try {
      buffer = readFileSync(`${path}/${url}.html`);
    } catch(e) {
      buffer = readFileSync(`${path}/notfound.html`);
    };
    res
      .status(200)
      .set("content-type", "text/html")
      .send(buffer);
  });

  return { app, vite }; // vite can used in tests which don't exist
};

createServer().then(({ app }) => app.listen(process.env.PORT,
  () => _logger.info(`${_filename(import.meta)} server running on ${process.env.PORT}`)
));
