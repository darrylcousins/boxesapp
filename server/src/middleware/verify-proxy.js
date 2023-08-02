/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import crypto from "crypto";
import "dotenv/config";

/**
  * Middleware for handling proxied requests from *.myshopify.com
  *
  * @param {object} options Currently an empty object in case we need options
 */
export function verifyProxy({ app }) {
  return async (req, res, next) => {

    const params = { ...req.query };

    // initialize template variables - updated in verifyAdmin or verifyCustomer
    res.locals.admin = false;
    res.locals.customer_id = false;

    if (Object.keys(req.headers).includes("x-forwarded-for")) {

      // signature is set by shopify when proxying the request, here we can
      // verify that we are indeed proxied from shopify
      if (params.hasOwnProperty("signature")) {
        const signature = params.signature;
        delete params.signature;
        
        const hashString = Object.entries(params).map(([key, value]) => `${key}=${Array(value).join(",")}`).sort().join('');

        const hash = crypto
          .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
          .update(hashString, 'utf8', 'hex')
          .digest('hex')

        if (hash === signature) {
          _logger.info(`${_filename(import.meta)} Passed verifyProxy`);

          res.locals.qs = `?sig=${params.sig}&ts=${params.ts}`;
          res.locals.host = process.env.HOST;
          res.locals.shop = process.env.SHOP;
          res.locals.recharge = process.env.RECHARGE_SHOP_NAME;
          res.locals.proxy_path = process.env.PROXY_PATH;
          res.locals.admin_email = process.env.ADMIN_EMAIL;

          return next();
        };
      };
      return res.sendStatus(403); // Forbidden
    };

    next();
  };
};

export function verifyProxyAdmin({ app }) {
  return async (req, res, next) => {

    const params = { ...req.query };

    // sig and ts are set on the link to admin-portal from admin/apps
    // so here I can verify that the link did come from admin/apps
    // the hex signature is created client side resources/app/App
    // and also do something of an expiry time
    // ??? XXX TODO a permanent store rather than using memory

    const timeOutHours = 8;
    const ts = params.ts;
    const hourDiff = (new Date().getTime() - ts)/1000/60/60;

    if (hourDiff <= timeOutHours
      && params.hasOwnProperty("sig") 
      && params.hasOwnProperty("ts")) {
      const str = `${ts}.${process.env.SHOP}.${process.env.SHOPIFY_API_KEY}`;
      const sig = crypto
        .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
        .update(str, 'utf8', 'hex')
        .digest('hex')
      res.locals.admin = (params.sig === sig);
      _logger.info(`${_filename(import.meta)} Passed verifyProxyAdmin`);
    } else {
      _logger.info(`${_filename(import.meta)} Failed verifyProxyAdmin`);
    };

    next();
  };
};

export function verifyProxyCustomer({ app }) {
  return async (req, res, next) => {

    const params = { ...req.query };

    // cid is set in the theme account.liquid

    if (params.hasOwnProperty("cid")) {
      res.locals.customer_id = params.cid;
      res.locals.proxy_path = process.env.PROXY_PATH;
      _logger.info(`${_filename(import.meta)} Passed verifyProxyCustomer`);
    } else {
      _logger.info(`${_filename(import.meta)} Failed verifyProxyCustomer`);
    };

    next();

  };
};
