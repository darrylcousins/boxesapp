/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import express from "express";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import morgan from "morgan";
import { readFileSync } from "fs";
import { resolve } from "path";
import "dotenv/config";

import { morganLogger, winstonLogger, consoleFormat } from "./../config/winston.js"

import { getMongoConnection, MongoStore } from "./lib/mongo/mongo.js";
import { getMockConnection } from "./lib/mongo/mongo-mock.js";
import getDevServer from "./lib/dev-server.js";
import { Shopify } from "./lib/shopify/index.js";
import { addShopifyWebhooks } from "./lib/shopify/webhooks.js";
import { Recharge } from "./lib/recharge/index.js";
import { addRechargeWebhooks } from "./lib/recharge/webhooks.js";

import applyShopifyWebhooks from "./middleware/shopify-webhooks.js";
import applyRechargeWebhooks from "./middleware/recharge-webhooks.js";
import applyAuthMiddleware from "./middleware/auth.js";
import apiMiddleware from "./middleware/api.js";

import verifyHost from "./middleware/verify-host.js";
import proxyWrite from "./middleware/proxy-write.js";
import docWrite from "./middleware/doc-write.js";
import { verifyProxy, verifyProxyAdmin, verifyProxyCustomer } from "./middleware/verify-proxy.js";

import api from "./api/index.js";

// make logger and env available globally - only in middleware, webhooks etc
global._logger = winstonLogger;

// creates mongo connection - mock get pulled down in afterAll
global._mongodb = (process.env.NODE_ENV !== "test") ? await getMongoConnection() : await getMockConnection();

// usage: _logger(`{_filename(import.meta)} my log message`);
global._filename = (_meta) => _meta.url.split("/").pop();

const isTest = process.env.NODE_ENV === "test" || !!process.env.VITE_TEST_BUILD;

if (!isTest) {
  await Shopify.initialize();
  await Recharge.initialize();
  if (Shopify.Context.ACCESS_TOKEN) {
    addShopifyWebhooks();
    addRechargeWebhooks();
  };
};

export async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === "production"
) {

  const app = express();

  morgan.token('host', function(req, res) {
    return req.hostname;
  });
  //const morganTokens = ':method :host :url :status :res[content-length] - :response-time ms';
  const morganTokens = ':method :url :status :res[content-length] - :response-time ms';
  if (!isTest) app.use(morgan(morganTokens, { stream: morganLogger.stream })); // simple

  // set headers
  app.set('trust proxy', 1);
  app.set("top-level-oauth-cookie", "shopify_top_level_oauth")

  app.use(cookieParser(process.env.SHOPIFY_API_SECRET));
  // checks for 'shop' parameter for (re)installing app
  applyAuthMiddleware({ app });
  // handles webhooks using registry
  if (!isTest) {
    applyShopifyWebhooks({ app });
    applyRechargeWebhooks({ app });
  };

  app.use(express.json()); // json for api

  app.use('/api', apiMiddleware({}));
  app.use('/api', api);

  app.use('/proxy/api', apiMiddleware({}));
  app.use('/proxy/api', api);

  app.use("/proxy", verifyProxy({ app }));

  // check query parameters and determine access
  app.use("/proxy/admin-portal", verifyProxyAdmin({ app }));
  app.use("/proxy/customer-portal", verifyProxyCustomer({ app }));

  let vite;

  if (isProd) {
    const compression = await import("compression").then(
      ({ default: fn }) => fn
    );
    const serveStatic = await import("serve-static").then(
      ({ default: fn }) => fn
    );
    app.use(compression());
    app.use(serveStatic(resolve("dist/client"), { index: false}));

  } else {
    vite = await getDevServer({ app, root, isTest });
    app.use(vite.middlewares);
  };

  const PROD_INDEX_PATH = resolve(root, "dist/client/src/assets");
  const DEV_INDEX_PATH = resolve(root, "src/assets");

  const path = isProd ? PROD_INDEX_PATH : DEV_INDEX_PATH;
  const tpl = isProd ? "" : "-portal";

  app.use("/proxy/admin-portal/docs", docWrite({ app, vite, path }));
  app.use("/proxy/customer-portal", proxyWrite({ app, vite, template: `customer${tpl}`, path }));
  app.use("/proxy/admin-portal", proxyWrite({ app, vite, template: `admin${tpl}`, path }));

  app.use("/*", (req, res, next) => {
    // will need to get more clever with this to account for the proxied liquid files
    const url = req.path === "/" ? "notfound" : req.path;

    let buffer;
    try {
      buffer = readFileSync(`${path}/${url}.html`);
    } catch(e) {
      buffer = null;
    };
    if (buffer) {
      res
        .status(200)
        .set("content-type", "text/html")
        .send(buffer);
    } else {
      res
        .status(400)
        .send("Not found");
    };
  });

  return { app, vite }; // vite can used in tests which don't exist
};

if (!isTest) {
  createServer().then(({ app }) => app.listen(process.env.PORT,
    () => _logger.info(`${_filename(import.meta)} server running on ${process.env.PORT}`)
  ));
};
