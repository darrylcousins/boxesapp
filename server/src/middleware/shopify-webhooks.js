/**
  * Middleware for shopify setup
  *
 */
import { Shopify } from "../lib/shopify/index.js";

export default function applyShopifyWebhooks({ app }) {

  app.post("/shopify", async (req, res) => {
    // Hmac/hash check takes place in registry.process!!
    const topic = req.get("x-shopify-topic");
    try {
      Shopify.Registry.process(req, res)
        .catch(err => console.error("error", err));
        _logger.info(`${_filename(import.meta)} Webhook ${topic} processed, returned status code 200`);
    } catch (err) {
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      if (!res.headersSent) {
        res.status(500).send(err.message);
      }
    };
  });

};

