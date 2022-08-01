/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 *
 * Manage the oauth with shopify, store and retrieve tokens
 */

/* Original code from shopify-cli */
import crypto from "crypto";
import "isomorphic-fetch";

import topLevelAuthRedirect from "../lib/top-level-auth-redirect.js";
import embeddedApp from "../lib/embedded-app.js";
import digestMessage from "../lib/digest-message.js";
//import { webhook_topics } from "../helpers/shopify.js";

export default function applyAuthMiddleware({ app }) {

  /*
   * First step to find matching session for the shop
   * When coming from the install link the query contains
   *   shop: the-shop.myshopify.com
   *   hmac: can use this to verify
   *   timestamp: ...
   *   host: the-shop.myshopify.com/admin
   */
  app.get("/", async (req, res, next) => {


    // we do have hmac here so perhaps should use if it is present
    // is it always present?
    const { shop, host, hmac, timestamp } = req.query;

    const session = await _mongodb.collection("shopify_sessions").findOne({shop});

    if (!session && shop && shop === process.env.SHOP) {
      // redirect for installation
      return res.redirect(`/auth?shop=${shop}`);

    };

    if (session && shop && shop !== process.env.SHOP) {
      // The current request is for a different shop. Redirect gracefully.
      return res.redirect(`/?shop=${shop}`);
    };

    // XXX if we don't have host we can get it from session
    if (host) {
      const ts = new Date().getTime();
      const str = `${ts}.${process.env.SHOP}.${process.env.SHOPIFY_API_KEY}`;
      const hash = crypto
        .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
        .update(str, 'utf8', 'hex')
        .digest('hex')
      const portal_url = `https://${process.env.SHOP}${process.env.PROXY_PATH}/admin-portal?sig=${hash}&ts=${ts}`;
      const args = {
        apiKey: process.env.SHOPIFY_API_KEY,
        host,
        portal_url
      };
      res.set("Content-Type", "text/html");
      return res.send(
        embeddedApp(args)
      );

    };

    next();
  });

  app.get("/auth", async (req, res) => {
    if (!req.signedCookies[app.get("top-level-oauth-cookie")]) {
      return res.redirect(
        `/auth/toplevel?${new URLSearchParams(req.query).toString()}`
      );
    }

    // redirect for installation if hmac, timestring and shop ?
    const params = {
      client_id: encodeURIComponent(process.env.SHOPIFY_API_KEY),
      scope: encodeURIComponent(process.env.SHOPIFY_SCOPES),
      redirect_uri: encodeURIComponent(`${process.env.HOST}/auth/callback`),
      state: encodeURIComponent(btoa("nonce key unique")),
    };
    const queryString = Object.entries(params).map(([key, value]) => `${key}=${Array(value).join(",")}`).sort().join('&');
    const redirect_uri = `https://${process.env.SHOP}/admin/oauth/authorize?${queryString}`;
    return res.redirect(redirect_uri);
  });

  app.get("/auth/toplevel", (req, res) => {
    res.cookie(app.get("top-level-oauth-cookie"), "1", {
      signed: true,
      httpOnly: true,
      sameSite: "strict",
    });

    console.log(req.query.host);

    res.set("Content-Type", "text/html");
    res.send(
      topLevelAuthRedirect({
        apiKey: process.env.SHOPIFY_API_KEY,
        hostName: process.env.SERVER_NAME,
        host: req.query.host,
        query: req.query,
      })
    );
  });

  app.get("/auth/callback", async (req, res) => {
    /*
     * The redirect url after successful confirmed installation
     * Query String params:
     *   code: authorization code - use this in request for access token
     *   hmac: use this to verify the request - how?
     *   host: base64 encoded hostname - I think this my app hostname?
     *   shop: the shop host e.g. https://test-shop.myshopify.com
     *   state: check this matches the state: nonce passed from /auth
     *   timestamp: check this also?
     *
     * Check the parameters - return 400 if it fails
     *
     * After all the checks then we send a request to POST
     * https://{shop}.myshopify.com/admin/oauth/access_token to get the access
     * token
     *
     * Post parameters are:
     *   client_id: SHOPIFY_API_KEY
     *   client_secret: SHOPIFY_API_SECRET
     *   code: the code provided in the request (above)
     * Response:
     *   access_token: this is now our API_ACCESS key
     *   scope: the scope allowed by the merchant
     *   expires_in: ?
     *
     * Then store the shop and response the collection shopify_sessions
     */

    const params = { ...req.query };

    let host;
    let hash;
    let state;
    let hmac;

    // check host
    if (params.hasOwnProperty("host")) {
      host = atob(params.host); // decode hostname
      console.log(host);
      // southbridge-dev.myshopify.com/admin
    };

    // check hmac
    if (params.hasOwnProperty("hmac")) {
      hmac = params.hmac;
      delete params.hmac;
      
      const hashString = Object.entries(params).map(([key, value]) => `${key}=${Array(value).join(",")}`).sort().join('');

      hash = crypto
        .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
        .update(hashString, 'utf8', 'hex')
        .digest('hex')

    };

    // check state
    if (params.hasOwnProperty("state")) {
      state = atob(params.state)
      // should equal "nonce key unique"
    };

    const body = {
     client_id: process.env.SHOPIFY_API_KEY,
     client_secret: process.env.SHOPIFY_API_SECRET,
     code: params.code,
    };

    // uses a mock request here for tests see __tests__/server.test.js
    const url = `https://${process.env.SHOP}/admin/oauth/access_token`;
    const session = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
      .then(response => response.json())
     /*
      * Response:
      *   access_token: this is now our API_ACCESS key
      *   scope: the scope allowed by the merchant
      *   expires_in: ?
      */

    session.shop = process.env.SHOP;
    session.host = params.host;
    session.timestamp = new Date().getTime();
    // store the session
    const result = await _mongodb.collection("shopify_sessions").insertOne(session);

    // this redirect shop pass the shop/session check now with the stored accessToken
    return res.redirect(`/?shop=${session.shop}&host=${params.host}`);

    try {

      console.log(params);

      /*
      _logger.notice(`Auth callback.`, { meta: { app: { token: session.accessToken, scope: session.scope }} });

      const topics = [ ...Object.keys(webhook_topics) ];
      topics.shift("APP_UNINSTALLED");
      for (const topic of topics) {
        Shopify.Webhooks.Registry.register({
          shop: session.shop,
          accessToken: session.accessToken,
          topic,
          path: "/webhooks",
        }).then(response => {
          const meta = {
            app: {
              topic: topic,
            }
          };
          if (!response[topic].success) {
            _logger.info(`Failed to register webhook: ${reponse.result}`);
            _logger.notice(`Failed to register webhook.`, { meta });
          };
        }).catch(err => {
           _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
        });
      };
      */

      // Redirect to app with shop parameter upon auth - what's this?
      res.redirect(`/?shop=${session.shop}&host=${host}`);
    } catch (e) {
      _logger.error({message: e.message, level: e.level, stack: e.stack, meta: e});
    }
  });
};
