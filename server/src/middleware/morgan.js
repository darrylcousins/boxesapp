/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import colors from "colors";
import morgan from "morgan";
import { morganLogger } from "../../config/winston.js"
/*
 * colorize morgan output to console
 */
export const morganMiddleware = morgan((tokens, req, res) =>  {
  let topic;
  Object.entries(req.headers).map(([header, value]) => {
    switch (header.toLowerCase()) {
      case "x-shopify-topic":
        topic = value;
        break;
      case "x-recharge-topic":
        topic = value;
        break;
    }
  });
  return [
    `${tokens.method(req, res)}`.green,
    `${tokens.status(req, res)}`.yellow,
    `${tokens['response-time'](req, res)} ms`.cyan,
    `${tokens.url(req, res)}${topic ? `-webhook/${topic}` : ""}`,
    ].join(' ');
}, { stream: morganLogger.stream });

