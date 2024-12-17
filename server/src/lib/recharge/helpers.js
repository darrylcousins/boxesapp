/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";
import { sortObjectByKeys, delay } from "../helpers.js";
import { makeApiJob } from "../../bull/job.js";
import { winstonLogger } from "../../../config/winston.js"

/*
 * Recharge error codes
 * 200 - OK: Everything worked as expected.
 * 201 - OK: The request was successful, created a new resource, and resource created is in the body.
 * 202 - OK: The request has been accepted and is in processing.
 * 204 - OK: The server has successfully fulfilled the request and there is no content to send in the response body.
 * 400 - Bad Request: The request was unacceptable, often due to a missing required parameter.
 * 401 - Unauthorized: No valid API key was provided.
 * 402 - Request Failed: The parameters were valid but the request failed.
 * 403 - The request was authenticated but not authorized for the requested resource (permission scope error).
 * 404 - Not Found: The requested resource doesn’t exist.
 * 405 - Method Not Allowed: The method is not allowed for this URI.
 * 406 - The request was unacceptable, or requesting a data source which is not allowed although permissions permit the request.
 * 409 - Conflict: You will get this error when you try to send two requests to edit an address or any of its child objects at the same time, in order to avoid out of date information being returned.
 * 415 - The request body was not a JSON object.
 * 422 - The request was understood but cannot be processed due to invalid or missing supplemental information.
 * 426 - The request was made using an invalid API version.
 * 429 - The request has been rate limited.
 * 500 - Internal server error.
 * 501 - The resource requested has not been implemented in the current version but may be implemented in the future.
 * 503 - A 3rd party service on which the request depends has timed out.
 */

export const makeRechargeQuery = async (opts) => {
  opts.processorName = "makeRechargeQuery";
  return await makeApiJob(opts);
};

/*
 * Construct and execute a query to recharge, used to get objects or post upates
 *
 * @function doRechargeQuery
 */
export const doRechargeQuery = async (opts) => {
  const { method, path, limit, query, body, title, finish, failedOnce } = opts;
  const http_method = method ? method : "GET";

  const start = "?";
  /* Not such a great idea because then I get charge updated BEFORE subscription updated
  if (finish) {
    const commit = ["commit", "true"];
    Array.isArray(query) ? query.push(commit) : query = [commit];
  };
  */
  if (limit) {
    const count = ["limit", limit];
    Array.isArray(query) ? query.push(count) : query = [count];
  };
  const reducer = (acc, curr, idx) => {
    const [key, value] = curr;
    return acc + `${ idx > 0 ? "&" : ""}${key}=${value}`;
  };
  const searchString = query ? `?${query.reduce(reducer, "")}` : "";
  
  const url = `${process.env.RECHARGE_URL}/${path}${searchString}`;

  const api_version = path.includes("batches") ? "2021-01" : process.env.RECHARGE_VERSION;

  return await fetch(encodeURI(url), {
    method: http_method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-RECHARGE-VERSION": api_version,
      "X-RECHARGE-ACCESS-TOKEN": process.env.RECHARGE_ACCESS_TOKEN,
    },
    body,
  }).then(async (response) => {

    let json = {};

    let meta = { // logging
      recharge: {
        uri: url,
        method: http_method,
        status: response.status,
        text: response.statusText,
        api_version,
      },
    };
    if (body) meta.recharge.body = JSON.parse(body);
    if (title) meta.recharge.title = title;
    const mapper = (acc, curr, idx) => {
      const [key, value] = curr;
      return { ...acc, [key]: value };
    };
    if (query) meta.recharge.query = query.reduce(mapper, {});

    if (http_method === "DELETE") {
      json = {};
    } else {
      json = await response.json();

      // log the error as a notice at log level error
      if (Object.hasOwnProperty.call(json, "error")) {
        if (!failedOnce && parseInt(response.status) === 409) { // Conflict, a call to this resource is in progress
          // I've tested this and it does work, if the problem persists I could
          // make failedOnce into an integer and make multiple attempts
          // Note that bull retries only on failure, in this case we have a
          // valid response so I need to handle it here
          // NB Keep an eye on the logs
          meta.recharge.boxesapp = "Retrying";
          meta.recharge.error = json.error;
          opts.failedOnce = true;
          meta.recharge = sortObjectByKeys(meta.recharge);
          winstonLogger.notice(`Recharge fetch error`, { meta });
          await delay(3000); // this only happens (it seems) during a webhook
          return await doRechargeQuery(opts);
        } else if (failedOnce) {
          meta.recharge.boxesapp = "Tried again, exiting";
          meta.recharge = sortObjectByKeys(meta.recharge);
          winstonLogger.notice(`Recharge fetch error`, { meta });
        };
      };
    };
    json.status = response.status;
    json.statusText = response.statusText;
    json.title = title;
    json.method = http_method;

    if (parseInt(response.status) > 299) {
      const err = {
        message: "Recharge request failed",
        method: http_method,
        status: response.status,
        statusText: response.statusText,
        title: title,
        uri: `${path}${searchString}`,
        api_version,
      };
      winstonLogger.error({message: err.message, meta: err});
      throw new Error(`Recharge request failed with code ${response.status}: "${response.statusText}", ${http_method} ${path}${searchString}`);
    };

    return json;
  });
};

/*
 * @function updateSubscription
 * @return { subscription } 
 */
export const updateSubscription = async ({ id, title, body, io, session_id }) => {
  const options = {};
  options.path = `subscriptions/${id}`;
  options.method = "PUT";
  options.title = title;
  options.body = JSON.stringify(body);
  options.io = io;
  options.session_id = session_id;
  const result = await makeRechargeQuery(options);
  return result;
};

/*
 * @function updateSubscriptions
 * @param { updates }
 * @return { includes } // new subscriptions created
 */
export const updateSubscriptions = async ({ updates, io, session_id }) => {

  //for (const update of updates) {
  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    delete update.shopify_product_id;
    const options = {};

    if (Object.hasOwn(update, "subscription_id")) {
      options.path = `subscriptions/${update.subscription_id}`;
      if (update.quantity === 0) {
        options.method = "DELETE";
        options.title = `Deleting ${update.title}`;
      } else {
        options.method = "PUT"; // updating a subscription
        options.title = `Updating ${update.title}`;
        const body = {
          properties: update.properties,
        };
        if (Object.hasOwn(update, "quantity")) body.quantity = update.quantity;
        if (Object.hasOwn(update, "price")) body.price = update.price;
        if (Object.hasOwn(update, "order_day_of_week")) body.order_day_of_week = update.order_day_of_week;
        if (Object.hasOwn(update, "charge_interval_frequency")) body.charge_interval_frequency = update.charge_interval_frequency;
        if (Object.hasOwn(update, "order_interval_frequency")) body.order_interval_frequency = update.order_interval_frequency;
        if (Object.hasOwn(update, "order_interval_unit")) body.order_interval_unit = update.order_interval_unit;
        if (Object.hasOwn(update, "external_product_id")) body.external_product_id = update.external_product_id;
        if (Object.hasOwn(update, "external_variant_id")) body.external_variant_id = update.external_variant_id;
        if (Object.hasOwn(update, "product_title")) body.product_title = update.product_title;
        if (Object.hasOwn(update, "variant_title")) body.variant_title = update.variant_title;
        options.body = JSON.stringify(body);
      };
    } else {
      // creating a new subscription requires post to subscriptions
      options.path = "subscriptions";
      options.method = "POST";
      options.title = `Creating ${update.product_title}`;
      options.body = JSON.stringify(update);
    };

    options.io = io;
    options.session_id = session_id;

    // need to pass in the finish call so to know that all have completed and we
    // can emit "final"
    if (i === updates.length - 1) {
      options.finish = true;
    };

    await makeRechargeQuery(options);

    await delay(3000);
  };
  return;
};
