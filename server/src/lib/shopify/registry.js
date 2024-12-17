/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * Borrowed heaviy from shopify-api code
 */
import "dotenv/config";
import "isomorphic-fetch";
import crypto from "crypto";
import logWebhook from "../recharge/log-webhook.js";
import { Shopify } from "./index.js";

export default class Registry {

  constructor({ store }) {
    this.Store = store;
    this.Handlers = {};
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Shopify-Api-Version': Shopify.Context.API_VERSION, 
    };
  };

  async process(req, res) {
    let reqBody = "";
    return new Promise((resolve, reject) => {
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
            case "x-shopify-hmac-sha256":
            hmac = value;
            break;
          case "x-shopify-topic":
            topic = value;
            break;
          case "x-shopify-shop-domain":
            domain = value;
            break;
          }
        });
        const missingHeaders = [];
        if (!hmac) missingHeaders.push("x-shopify-hmac-sha256");
        if (!topic) missingHeaders.push("x-shopify-topic");
        if (!domain) missingHeaders.push("x-shop-domain");
        if (missingHeaders.length) {
          res.status(400);
          res.send("Missing headers");
          return reject(new Error(`Missing headers when processing webhook ${missingHeaders.join(" ,")}`));
        };
        let statusCode = 200;
        let responseError;
        const headers = {};
        const hash = crypto
          .createHmac("sha256", Shopify.Context.API_SECRET_KEY)
          .update(reqBody, "utf8")
          .digest("base64")

        let webhookTopic;
        let webhookHandler;
        if (hash === hmac) {
          webhookTopic = topic
            .toUpperCase()
            .replace(/\//g, '_');
          statusCode = 200;
        } else {
          statusCode = 403;
          responseError = new Error(`Shopify webhook failed hmac validation for topic ${topic}`);
        };
        res.writeHead(statusCode, headers);
        res.end();

        if (responseError) {
          return reject(responseError);
        } else {
          webhookHandler = this.getHandler(webhookTopic);
          if (webhookHandler) {
            if (parseInt(process.env.DEBUG) === 1) {
              await logWebhook(webhookTopic, JSON.parse(reqBody), "shopify");
            };
            try {
              await webhookHandler(webhookTopic, domain, reqBody);
            } catch(err) {
              return reject(err);
            };
          } else {
            const err = new Error(`Shopify webhook ${topic} unknown handler.`);
            _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
            return reject(err);
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
    const existing = await this.Store.getItem({topic, service: "shopify"});
    if (existing) {
      // double check by calling to api
      const options = {
        method: "GET",
        headers: this.headers,
      };
      // update on the fly
      options.headers['X-Shopify-Access-Token'] = Shopify.Context.ACCESS_TOKEN;
      const fetchUrl = `${Shopify.Context.API_URL}/admin/api/${Shopify.Context.API_VERSION}/webhooks/${existing.webhook_id}.json`;
      const { webhook } = await fetch(fetchUrl, options)
        .then(result => result.json());
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
        webhook: {
          "address": `https://${Shopify.Context.HOST_NAME}/${path}`,
          "topic": tidyTopic,
          "format": "json",
        }
      };
      const options = {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      };
      // update on the fly
      options.headers['X-Shopify-Access-Token'] = Shopify.Context.ACCESS_TOKEN;
      const url = `${Shopify.Context.API_URL}/admin/api/${Shopify.Context.API_VERSION}/webhooks.json`;
      const result = await fetch(url, options);
      let success = false;
      let errors = {};
      let data;
      const meta = {
        shopify: {}
      };
      try {
        data = await result.json();
      } catch(e) {
        data = {};
      };
      if (data.hasOwnProperty("webhook")) {
        const doc = {
          service: "shopify",
          topic,
          webhook_id: data.webhook.id,
        };
        this.Store.setItem(doc, {topic, service: "shopify"}); // upsert if found the topic
        this.Handlers[topic] = handler;
        success = true;
        meta.shopify = { topic, id: data.webhook.id };
        _logger.notice(`Shop webhook ${tidyTopic} registered.`, { meta });
      } else {
        errors = typeof(data.errors) === "string" ? { error: data.errors } : data.errors;
      };
      if (!success) {
        errors.topic = tidyTopic;
        meta.shopify = errors;
        _logger.notice(`Shop webhook ${tidyTopic} failed to register.`, { meta });
      };
    };
  };
};

