/**
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * Middleware for shopify webhooks
 *
 */
import { Shopify } from "../lib/shopify/index.js";

export default function applyShopifyWebhooks({ app }) {

  app.post("/shopify", async (req, res) => {
    // Hmac/hash check takes place in registry.process!!
    const topic = req.get("x-shopify-topic");
    try {
      Shopify.Registry.process(req, res)
        .then(
          (res) => {
            _logger.info(`Shopify webhook ${topic} processed, returned 200.`);
          },
          (err) => {
            _logger.info(`Shopify webhook ${topic} failed and logged.`);
            _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
          }
        );
    } catch (err) {
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      if (!res.headersSent) {
        res.status(500).send(err.message);
      }
    };
  });

};

