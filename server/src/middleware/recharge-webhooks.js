/**
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * Middleware for recharge webhooks
 *
 */
import colors from "colors";
import { Recharge } from "../lib/recharge/index.js";

export default function applyRechargeWebhooks({ app }) {

  app.post("/recharge", async (req, res) => {
    const topic = req.get("x-recharge-topic");

    // don't really need this to be logged
    /*
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const nowString = `${hours}:${minutes}:${seconds}`;
    const message = `Recharge webhook ${topic} received.`;
    const logString = `${nowString} - ${"info".yellow}: ${message}`;
    console.log(logString);
    */

    // The following info messages are not logged to console in production
    // But the error message is logged
    try {
      Recharge.Registry.process(req, res)
        .then(
          (res) => {
            if (res) { // mostly returns null value
              _logger.info(`Recharge webhook ${topic} processed, returned 200.`);
            };
          },
          (err) => {
            _logger.info(`Recharge webhook ${topic} failed and logged.`);
            _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
          }
        ).catch(err => {
          _logger.info(`Recharge webhook ${topic} failed and logged.`);
          _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
        });
    } catch (err) {
      _logger.info(`EVEN HERE Recharge webhook ${topic} failed and logged.`);
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      if (!res.headersSent) {
        res.status(500).send(err.message);
      }
    };
  });

};

