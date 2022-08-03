/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";

/**
 * CORS middleware for api calls. We cannot use basic auth for the location
 * /api because then the credentials will be visible (even though base64
 * envoded anyone could decode it with `atob` and then have acces to the
 * admin site. Nginx does include Access-Control-Allow-Origin do prevent
 * scripts running in a browser from another domain, however `curl` requests
  * are unprotected. I want to add a layer of security because customer data
  * would otherwise be accessible.
  *
  * @param {object} options Currently an empty object in case we need options
 */
export default function (options) {
  return function (req, res, next) {

    // bypass authentication if running on localhost
    if (req.hostname === "localhost" && process.env.SERVER === "local") {
      next();
    } else {
      // Implement the middleware function based on the options object
      const allowed = process.env.ALLOW_ORIGINS.split(',').map(el => el.trim());
      //allowed.push(req.hostname);

      const host = req.get('host'); // always set with fetch callee

      if (typeof host === 'undefined') {
        res.sendStatus(403); // Forbidden
        return;
      } else {
        if (!allowed.includes(host)) {
          res.sendStatus(403); // Forbidden
          return;
        }
      }
    _logger.info(`${_filename(import.meta)} Passed through api auth middleware`);
      next();
    };
  };
};

