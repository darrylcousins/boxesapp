import "dotenv/config";

/**
  * Middleware for handling proxied requests from *.myshopify.com
  * Basically the goal is to disallow any requests to process.env.SERVER
  *
  * @param {object} options Currently an empty object in case we need options
 */
export default function verifyHost({ app, isProd }) {
  return async (req, res, next) => {

    //if (!isProd) return next();

    // in production do not allow any page requests from anywhere but the shopify site
    // what I want to do here is ensure that we are either the embedded app or proxied
    // this is very specific to only get html links, XXX make it better
    if (req.baseUrl === "" || req.baseUrl.includes("proxy") || req.baseUrl.includes("portal")) {
      if (req.hostname === process.env.SERVER_NAME) { // hosted site
        if (!req.query.hasOwnProperty("shop") || req.query.shop !== process.env.SHOP) {
          return res.sendStatus(403); // Forbidden
        };
      };
    };
    if (!(req.hostname === process.env.SERVER_NAME || req.hostname === process.env.SHOP)) {
      return res.sendStatus(403); // Forbidden
    };

    const corsWhitelist = [
      process.env.HOST,
    ];
    if (corsWhitelist.indexOf(req.headers.origin) !== -1) {
      res.header('Access-Control-Allow-Origin', req.headers.origin);
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    }
    return next();

  };
};


