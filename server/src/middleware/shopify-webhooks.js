/**
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * Middleware for shopify webhooks
 *
 */
import colors from "colors";
import { Shopify } from "../lib/shopify/index.js";

export default function applyShopifyWebhooks({ app }) {

  app.post("/shopify", async (req, res) => {
    const topic = req.get("x-shopify-topic");

    // don't really need this to be logged
    /*
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const nowString = `${hours}:${minutes}:${seconds}`;
    const message = `Shopify webhook ${topic} received.`;
    const logString = `${nowString} - ${"info".yellow}: ${message}`;
    console.log(logString);
    */

    // The following info messages are not logged to console in production
    // But the error message is logged
    try {
      Shopify.Registry.process(req, res)
        .then(
          (res) => {
            if (res) { // mostly returns null value
              _logger.info(`Shopify webhook ${topic} processed, returned 200.`);
            };
          },
          (err) => {
            _logger.info(`Shopify webhook ${topic} failed and logged.`);
            _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
          }
        ).catch(err => {
          _logger.info(`Shopify webhook ${topic} failed and logged.`);
          _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
        });
    } catch (err) {
      _logger.info(`Shopify webhook ${topic} failed and logged.`);
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      if (!res.headersSent) {
        res.status(500).send(err.message);
      }
    };
  });

};

