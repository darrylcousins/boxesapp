/**
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * Middleware for recharge webhooks
 *
 */
import { Recharge } from "../lib/recharge/index.js";

export default function applyRechargeWebhooks({ app }) {

  app.post("/recharge", async (req, res) => {
    // Hmac/hash check takes place in registry.process!!
    const topic = req.get("x-recharge-topic");
    try {
      Recharge.Registry.process(req, res)
        .then(
          (res) => {
            _logger.info(`Recharge webhook ${topic} processed, returned 200.`);
          },
          (err) => {
            _logger.info(`Recharge webhook ${topic} failed and logged.`);
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

