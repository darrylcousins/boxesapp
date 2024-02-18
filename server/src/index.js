/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import morgan from "morgan";
import http from "http";
import { readFileSync } from "fs";
import { resolve } from "path";
import { Server as SocketServer } from "socket.io"; // socket connection

import { morganLogger, winstonLogger, consoleFormat } from "./../config/winston.js"

import { getMongoConnection, MongoStore } from "./lib/mongo/mongo.js";
import { getMockConnection } from "./lib/mongo/mongo-mock.js";
import getDevServer from "./lib/dev-server.js";
import { Shopify } from "./lib/shopify/index.js";
import { addShopifyWebhooks } from "./lib/shopify/webhooks.js";
import { Recharge } from "./lib/recharge/index.js";
import { addRechargeWebhooks } from "./lib/recharge/webhooks.js";
import { delay } from "./lib/helpers.js";

import applyShopifyWebhooks from "./middleware/shopify-webhooks.js";
import applyRechargeWebhooks from "./middleware/recharge-webhooks.js";
import applyAuthMiddleware from "./middleware/auth.js";
import apiMiddleware from "./middleware/api.js";

import verifyHost from "./middleware/verify-host.js";
import proxyWrite from "./middleware/proxy-write.js";
import docWrite from "./middleware/doc-write.js";
import { morganMiddleware } from "./middleware/morgan.js";
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
  /*
  morgan.token('host', function(req, res) {
    return req.hostname;
  });
  const morganTokens = ':method :status :response-time ms :url :res[content-length]';
  if (!isTest) app.use(morgan(morganTokens, { stream: morganLogger.stream })); // simple
  */
  if (!isTest) app.use(morganMiddleware); // colorised

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

  app.use('/api', apiMiddleware({}));
  app.use('/api', api);

  app.use('/proxy/api', apiMiddleware({}));
  app.use('/proxy/api', api);

  app.use("/proxy", verifyProxy({ app }));

  // check query parameters and determine access
  app.use("/proxy/admin-portal", verifyProxyAdmin({ app }));
  app.use("/proxy/customer-portal", verifyProxyCustomer({ app }));

  const PROD_INDEX_PATH = resolve(root, "dist/client/src/assets");
  const DEV_INDEX_PATH = resolve(root, "src/assets");

  const path = isProd ? PROD_INDEX_PATH : DEV_INDEX_PATH;
  const tpl = isProd ? "" : "-portal";

  // these two do nothing
  app.use("/proxy/admin-portal/docs", docWrite({ app, vite, path }));

  app.use("/proxy/customer-portal", proxyWrite({ app, vite, template: `customer${tpl}`, path }));
  app.use("/proxy/admin-portal", proxyWrite({ app, vite, template: `admin${tpl}`, path }));

  app.use("/*", (req, res, next) => {
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
        .status(404)
        .send("Not found");
    };
    next();
  });

  return { app, vite }; // vite can used in tests which don't exist
};

if (!isTest) {
  createServer().then(({ app, vite }) => {

    const server = app.listen(
      process.env.PORT,
      () => morganLogger.info(`${_filename(import.meta)} server running on ${process.env.PORT}, NODE_ENV=${process.env.NODE_ENV}`)
    );

    const io = new SocketServer(server, {
      path: "/proxy/socket-io/",
      addTrailingSlash: false,
    });

    // try storing sockets in mongodb instead of on the server thread
    const sockets = {};

    //Whenever someone connects this gets executed
    io.on('connection', function(socket) {

      socket.on("connectInit", async session_id => {

        console.log('socket connection created [socket.id, session_id]', socket.id, session_id);
        // The socket ID is stored along with the unique ID generated by the client
        /*
         * XXX May still do it this way yet????
        await _mongodb.collection("sockets").updateOne(
          {
            socket_id: socket.id,
          },
          { "$set" : {
            session_id,
            socket_id: socket.id,
          }},
          { "upsert": true }
        );
        */

        sockets[session_id] = socket.id
        // The sockets object is stored in Express so it can be grabbed in a route
        app.set("sockets", sockets)
        // e.g req.app.sockets[session_id]
        socket.emit("connected", session_id); // feedback to client
      })

      //Whenever someone disconnects this piece of code executed
      socket.on('disconnect', () => {

        const tmpSockets = app.get('sockets');
        if (tmpSockets) {
          for (const [key, value] of Object.entries(tmpSockets)) {
            if (value === socket.id) {
              delete tmpSockets[key];
              console.log('removed socket on disconnect', key, value);
            };
          };
          app.set('sockets', tmpSockets);
          console.log(app.get("sockets"));
        };

      });
    });

    // The io instance is set in Express so it can be grabbed in a route
    // e.g req.app.io
    app.set("io", io);

    /* E.G. in a request
        const {session_id} = req.body;
        const thisSocketId = req.app.get('sockets')[session_id];
        const socketInstance = req.app.get('io').to(thisSocketId);
        socketInstance.emit('uploadProgress', 'File uploaded, processing data...');
    */

  });
};
