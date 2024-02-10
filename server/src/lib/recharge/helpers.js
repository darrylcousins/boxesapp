/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";
import fs from "fs/promises";
import { makeShopQuery } from "../shopify/helpers.js";
import { getNZDeliveryDay } from "../dates.js";
import { makeApiJob } from "../../bull/job.js";
import { winstonLogger } from "../../../config/winston.js"

/*
 * Helper method for debugging the flow of updates made to recharge so that we
 * can allow the user to further edit their box. See registry.js.
*/
export const logWebhook = async (topic, body) => {
  const dt = new Date();
  let month = ("0" + (dt.getMonth() + 1)).slice(-2);
  let day = ("0" + dt.getDate()).slice(-2);
  let printDate = `${dt.getFullYear()}-${month}-${day} ${dt.getHours()}:${dt.getMinutes()}:${dt.getSeconds()}`;

  let data = {};
  if (topic === "CHARGE_DELETED") {
    data.charge_id = body.charge.id;
  } else if (topic.startsWith("CHARGE")) {
    const { charge } = body;
    let properties = {};
    let title;
    for (const line_item of charge.line_items) {
      if (line_item.properties.some(el => el.name === "Including")) {
        title = line_item.title;
        properties = line_item.properties.reduce(
          (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
          {});
      };
    };
    data = {
      charge_id: charge.id,
      address_id: charge.address_id,
      customer_id: charge.customer.id,
      scheduled_at: charge.scheduled_at,
      box_title: title,
      deliver_at: properties["Delivery Date"],
      rc_subscription_ids: charge.line_items.map(el => {
        return {
          shopify_product_id: el.external_product_id.ecommerce,
          subscription_id: el.purchase_item_id,
          quantity: el.quantity,
          title: el.title,
        };
      }),
    };
  } else if (topic.startsWith("SUBSCRIPTION")) {
    const { subscription } = body;
    const properties = subscription.properties.reduce(
      (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
      {});
    data = {
      subscription_id: subscription.id,
      address_id: subscription.address_id,
      customer_id: subscription.customer_id,
      scheduled_at: subscription.next_charge_scheduled_at,
      deliver_at: properties["Delivery Date"],
      quantity: subscription.quantity,
      title: subscription.product_title,
    };
  };
  await fs.appendFile("webhooks.txt", `${printDate} ${topic}\n`, "utf8");
  await fs.appendFile("webhooks.txt", `${JSON.stringify(data, null, 2)}\n`, "utf8");
};

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
 * @function makeRechargeQuery
 */
export const doRechargeQuery = async ({method, path, limit, query, body, title, finish}) => {
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

  return await fetch(encodeURI(url), {
    method: http_method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-RECHARGE-VERSION": process.env.RECHARGE_VERSION,
      "X-RECHARGE-ACCESS-TOKEN": process.env.RECHARGE_ACCESS_TOKEN,
    },
    body,
  }).then(async (response) => {

    let json = {};

    if (http_method === "DELETE") {
      json = {};
    } else {
      json = await response.json();

      // log the error as log level error
      if (Object.hasOwnProperty.call(json, "error")) {
        const meta = {
          recharge: {
            uri: url,
            method: http_method,
            status: json.status,
            text: json.statusText,
            error: json.error,
          },
        };
        winstonLogger.notice(`Recharge fetch error`, { meta });
      };
    };
    json.status = response.status;
    json.statusText = response.statusText;
    json.title = title;
    json.method = http_method;

    if (parseInt(response.status) > 299) {
      throw new Error(`Recharge request failed with code ${response.status}: "${response.statusText}"`);
    };

    return json;
  });
};

/*
 * @function getSubscription
 * @return { subscription } 
 */
export const getSubscription = async (id, title) => {
  const { subscription } = await makeRechargeQuery({
    method: "GET",
    path: `subscriptions/${id}`,
    title,
  });
  return subscription;
};

/*
 * @function updateSubscription
 * @return { subscription } 
 */
export const updateSubscription = async ({ id, title, body, io, session_id }) => {
  const options = {};
  options.path = `subscriptions/${id}`;
  options.method = "PUT";
  options.body = JSON.stringify(body);
  options.io = io;
  options.session_id = session_id;
  options.title = title;
  const result = await makeRechargeQuery(options);
  return result;
};

/*
 * @function updateChargeDate
 * @return { subscription }
 */
export const updateChargeDate = async ({ id, date, title, io, session_id }) => {
  const options = {};
  options.path = `subscriptions/${id}/set_next_charge_date`;
  options.method = "POST";
  options.body = JSON.stringify({ date });
  options.io = io;
  options.session_id = session_id;
  options.title = title;
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

    if (Object.hasOwnProperty.call(update, "subscription_id")) {
      options.path = `subscriptions/${update.subscription_id}`;
      if (update.quantity === 0) {
        options.method = "DELETE";
        options.title = `Deleting ${update.title}`;
      } else {
        options.method = "PUT"; // updating a subscription
        options.title = `Updating ${update.title}`;
        const body = {
          properties: update.properties,
          quantity: update.quantity,
        };
        if (Object.hasOwnProperty.call(update, "price")) body.price = update.price;
        if (Object.hasOwnProperty.call(update, "order_day_of_week")) body.order_day_of_week = update.order_day_of_week;
        if (Object.hasOwnProperty.call(update, "charge_interval_frequency")) body.charge_interval_frequency = update.charge_interval_frequency;
        if (Object.hasOwnProperty.call(update, "order_interval_frequency")) body.order_interval_frequency = update.order_interval_frequency;
        if (Object.hasOwnProperty.call(update, "order_interval_unit")) body.order_interval_unit = update.order_interval_unit;
        if (Object.hasOwnProperty.call(update, "external_product_id")) body.external_product_id = update.external_product_id;
        if (Object.hasOwnProperty.call(update, "external_variant_id")) body.external_variant_id = update.external_variant_id;
        if (Object.hasOwnProperty.call(update, "product_title")) body.product_title = update.product_title;
        if (Object.hasOwnProperty.call(update, "variant_title")) body.variant_title = update.variant_title;
        options.body = JSON.stringify(body);
      };
    } else {
      // creating a new subscription requires post to subscriptions
      options.title = `Creating ${update.product_title}`;
      options.path = "subscriptions";
      options.method = "POST";
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

  };
  return;
};

/*
 * @function getCharge
 * @returns { charge }
 */
export const getCharge = async ({ charge_id }) => {
  const { charge } = await makeRechargeQuery({
    path: `charges/${charge_id}`,
    title: "Get charge by id",
  });
  return charge;
};

/*
 * @function getLastOrder
 * @returns { order }
 */
export const getLastOrder = async ({ customer_id, address_id, subscription_id, product_id }) => {
  const { charges } = await makeRechargeQuery({
    path: `charges`,
    query: [
      ["customer_id", customer_id ],
      ["address_id", address_id ],
      ["purchase_item_id", subscription_id ],
      ["status", "success" ],
      ["limit", 1 ],
    ],
    title: "Get last order",
  });
  const charge = (charges.length) ? charges[0] : null;
  if (charge) {
    const { order } = await makeShopQuery({
      path: `orders/${charge.external_order_id.ecommerce}.json`,
      fields: ["current_total_price", "order_number", "tags", "line_items"],
      title: "Get order",
    });
    if (!order) return {};
    order.delivered = null;
    for (const tag of order.tags.split(",")) {
      const parsed = Date.parse(tag.trim()); // ensure we get a date
      if (!isNaN(parsed)) {
        order.delivered = tag;
        break;
      };
    };
    delete order.tags;
    order.line_items = order.line_items
        .map(el => {
        return {
          name: el.name,
          properties: el.properties,
          price: el.price,
          product_id: el.product_id,
          title: el.title,
          variant_title: el.variant_title,
        };
      });
    order.box = order.line_items.find(el => el.properties.some(e => e.name === "Including"));
    delete order.line_items; // more data than required
    return order;
  };
  return {}; // always return an object
};

/*
 * @function findBoxes
 * @returns { fetchBox, previousBox, hasNextBox }
 */
export const findBoxes = async ({ days, nextDeliveryDate, shopify_product_id }) => {
  let fetchBox = null;
  let previousBox = null;
  let hasNextBox = false;
  let delivered = new Date(nextDeliveryDate);
  const dayOfWeek = delivered.getDay();

  const pipeline = [
    { "$match": { 
      active: true,
      shopify_product_id,
    }},
    { "$project": {
      deliverDate: {
        $dateFromString: {dateString: "$delivered", timezone: "Pacific/Auckland"}
      },
      delivered: "$delivered",
      deliverDay: { "$dayOfWeek": { $dateFromString: {dateString: "$delivered", timezone: "Pacific/Auckland"} }},
    }},
    { "$match": { deliverDay: dayOfWeek } },
    { "$project": {
      delivered: "$delivered",
      deliverDate: "$deliverDate",
      deliverDay: "$deliverDay",
    }},
  ];

  let dates = await _mongodb.collection("boxes").aggregate(pipeline).toArray();
  dates = dates.map(el => el.delivered).reverse();

  // if our date is in the array then we have the next box
  if (dates.indexOf(delivered.toDateString()) !== -1) hasNextBox = true;

  // if not then we need to dial back the deliver date until we find a box
  if (!hasNextBox) {

    // to avoid dropping into an infinite loop first check that our date is at
    // least greater than the earliest date of the list
    if (new Date(dates[dates.length - 1]).getTime() < delivered.getTime()) {
      while (dates.indexOf(delivered.toDateString()) === -1) {
        delivered.setDate(delivered.getDate() - days);
      };
    };
  };

  // first find if the targeted date is in the list by splicing the list to that date
  for (const d of dates) {
    if (!fetchBox) {
      if (d === delivered.toDateString()) { // do we have the upcoming box? i.e. nextBox
        fetchBox = await _mongodb.collection("boxes").findOne({delivered: d, shopify_product_id});
        delivered.setDate(delivered.getDate() - days); // do we have the next box?
      };
    } else if (!previousBox) {
      if (d === delivered.toDateString()) { // do we have the upcoming box? i.e. nextBox
        previousBox = await _mongodb.collection("boxes").findOne({delivered: d, shopify_product_id});
        delivered.setDate(delivered.getDate() - days); // do we have the next box?
      };
    };
  };

  // create a mock box
  if (!fetchBox) {
    fetchBox = {
      shopify_title: "",
      includedProducts: [],
      addOnProducts: [],
    };
  };

  return {
    fetchBox,
    previousBox,
    hasNextBox
  };
};
