/**
  * Middleware for shopify setup
  *
 */
import { Recharge } from "../lib/recharge/index.js";

export default function applyRechargeWebhooks({ app }) {

  app.post("/recharge", async (req, res) => {
    // Hmac/hash check takes place in registry.process!!
    const topic = req.get("x-recharge-topic");
    try {
      Recharge.Registry.process(req, res)
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

