/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * Borrowed heaviy from shopify-api code
 */
import "dotenv/config";
import crypto from "crypto";
import { Recharge } from "./index.js";

export default class Registry {

  constructor({ store }) {
    this.Store = store;
    this.Handlers = {};
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-RECHARGE-VERSION': Recharge.Context.API_VERSION, 
      'X-RECHARGE-ACCESS-TOKEN': Recharge.Context.ACCESS_TOKEN, 
    };
  };

  async process(req, res) {
    let reqBody = "";
    const promise = new Promise((resolve, reject) => {
      req.on("data", (chunk) => {
        reqBody += chunk;
      });
      req.on('end', async () => {
        if (!reqBody.length) {
          res.status(400);
          res.send("No body received");
          return reject(new Error("No body was received when processing webhook"));
        };
        let hmac;
        let topic;
        let domain;
        Object.entries(req.headers).map(([header, value]) => {
          switch (header.toLowerCase()) {
            case "x-recharge-hmac-sha256":
            hmac = value;
            break;
          case "x-recharge-topic":
            topic = value;
            break;
          case "x-recharge-external-platform-domain":
            domain = value;
            break;
          }
        });
        const missingHeaders = [];
        if (!hmac) missingHeaders.push("x-recharge-hmac-sha256");
        if (!topic) missingHeaders.push("x-recharge-topic");
        if (!domain) missingHeaders.push("x-recharge-external-platform-domain");
        if (missingHeaders.length) {
          res.status(400);
          res.send("Missing headers");
          return reject(new Error(`Missing headers when processing webhook ${missingHeaders.join(" ,")}`));
        };
        let statusCode;
        let responseError;
        const headers = {};
        const hash = crypto
          .createHash('sha256')
          .update(Recharge.Context.CLIENT_SECRET, 'utf8')
          .update(reqBody, 'utf8')
          .digest('hex');

        let webhookTopic;
        let webhookHandler;
        if (hash === hmac) {
          webhookTopic = topic
            .toUpperCase()
            .replace(/\//g, '_');
          statusCode = 200;
        } else {
          statusCode = 403;
          responseError = new Error(`Recharge webhook failed hmac validation for topic ${topic}`);
        };
        res.writeHead(statusCode, headers);
        res.end();

        if (responseError) {
          return reject(responseError);
        } else {
          webhookHandler = this.getHandler(webhookTopic);
          if (webhookHandler) {
            try {
              await webhookHandler(webhookTopic, domain, reqBody);
            } catch(error) {
              return reject(error);
            };
          } else {
            const err = new Error(`Recharge webhook ${topic} unknown handler.`);
            _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
            return reject(error);
          };
          return resolve();
        };
      });
    });
  };

  getHandler(topic) {
    return this.Handlers[topic];
  };

  /*
   * Check that we have stored the webhook otherwise post the webhook
   */
  async addHandler({topic, path, handler}) {
    const existing = await this.Store.getItem({topic, service: "recharge"});
    if (existing) {
      // double check by calling to api
      const options = {
        method: "GET",
        headers: this.headers,
      };
      const { webhook } = await fetch(`${Recharge.Context.API_URL}/webhooks/${existing.webhook_id}`, options)
        .then(result => {
          const res = result.json();
          return res;
        });
      if (webhook.id === existing.webhook_id && webhook.topic === existing.topic.toLowerCase().replace(/_/g, '/')) {
        this.Handlers[topic] = handler;
        return; // webhook exists and match stored data
      } else {
        // stored webhook and id does not exist amongst recharge webhooks - stale data?
        // first check if the webhook has been created for the topic
        // if it has then update the local store
      };
    } else {
      const tidyTopic = topic.toLowerCase().replace(/_/g, '/');
      // create the webhook and update local store
      const body = {
        "address": `${Recharge.Context.HOST_NAME}/${path}`,
        "topic": tidyTopic,
        //"included_objects": [ "metafields" ], // consider customer with appropiate endpoints?
        "version": Recharge.Context.API_VERSION,
      }
      const options = {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      };
      const url = `${Recharge.Context.API_URL}/webhooks`;
      const result = await fetch(url, options);
      let success = false;
      let errors = {};
      let data;
      const meta = {
        recharge: {}
      };
      try {
        data = await result.json();
      } catch(e) {
        data = {};
      };
      if (data.hasOwnProperty("webhook")) {
        const doc = {
          service: "recharge",
          topic,
          webhook_id: data.webhook.id,
        };
        this.Store.setItem(doc, {topic, service: "recharge"}); // upsert if found the topic
        this.Handlers[topic] = handler;
        success = true;
        meta.recharge = { topic, id: data.webhook.id };
        _logger.notice(`Recharge webhook ${tidyTopic} registered.`, { meta });
      } else {
        errors = typeof(data.errors) === "string" ? { error: data.errors } : data.errors;
      };
      if (!success) {
        errors.topic = tidyTopic;
        meta.recharge = errors;
        _logger.notice(`Recharge webhook ${tidyTopic} failed to register.`, { meta });
      };
    };
  };
};

