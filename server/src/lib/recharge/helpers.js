/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import "dotenv/config";
import { Job } from "bullmq";
import { makeShopQuery } from "../shopify/helpers.js";
import { getNZDeliveryDay } from "../dates.js";
import { queue, queueEvents } from "../../bull/queue.js";
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

//export const makeRechargeQuery = async ({method, path, limit, query, body}) => {
export const makeRechargeQuery = async (opts) => {

  const { io, session_id, finish } = opts;
  delete opts.io;

  const emit = ({ io, eventName, message }) => { // args should be the rest of it
    if (io) {
      io.emit(eventName, message);
    };
  };

  const eventName = "uploadProgress";
  const title = (typeof opts.title !== "undefined") ? `"${opts.title}"` : "";

  emit({
    io,
    eventName,
    message: `${session_id} Received query continue...`
  });

  // opts is the job data passed to doRechargeQuery
  const job = await queue.add(
    "makeRechargeQuery",
    opts,
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  )
  console.log("Queued")
  emit({
    io,
    eventName,
    message: `Queued ${title} update...`
  });


  if (io) {
    queueEvents.on('progress', async ({ jobId, data }, timestamp) => {
      const job = await Job.fromId(queue, jobId);
      if (typeof job.data.session_id !== "undefined") {
        console.log("job completed with session_id: ", job.data.session_id)
        const title = (typeof job.data.title !== "undefined") ? job.data.title : "";
        emit({
          io,
          eventName,
          message: `Updating ${title}...`
        });
      };
    });
    queueEvents.on('completed', async ({ jobId, returnvalue }) => {
      const job = await Job.fromId(queue, jobId);
      if (typeof job.data.session_id !== "undefined") {
        console.log("job completed with session_id: ", job.data.session_id)
        const title = (typeof job.data.title !== "undefined") ? job.data.title : "";
        emit({
          io,
          eventName,
          message: `Update ${title} completed...`
        });
        if (typeof job.data.finish !== "undefined") {
          // e.g. updateSubscriptions
          console.log("all jobs completed: ", job.data.session_id)
          emit({
            io,
            eventName: "finished",
            message: job.data.session_id
          });
        };
      };
    });
  };

  await job.updateProgress(`Update ${title} executing...`);
  /*
   * Returns one of these values: "completed", "failed", "delayed", "active", "waiting", "waiting-children", "unknown".
   */
  // const state = await job.getState();

  // This correctly waits until the job is done :)
  await job.waitUntilFinished(queueEvents)
  console.log("Done");

  const finished = await Job.fromId(queue, job.id)

  const { method, status, statusText, title: queryTitle } = finished.returnvalue;
  console.log(method, status, statusText, queryTitle ? queryTitle : "");

  // this will still go back to the caller
  if (parseInt(status) > 299) {
    throw new Error(`Recharge request failed with code ${status}: "${statusText}"`);
  };

  delete finished.returnvalue.status;
  delete finished.returnvalue.statusText;
  delete finished.returnvalue.queryTitle;
  delete finished.returnvalue.method;

  return finished.returnvalue;
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
  })
    .then(async (response) => {

      let json = {};

      if (http_method === "DELETE") {
        json = response;
        winstonLogger.warn(`Recharge delete`, { meta: json });
      } else {
        json = await response.json();

        // log the error as log level warn
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
          winstonLogger.warn(`Recharge fetch error`, { meta });
        };
        json.status = response.status;
        json.statusText = response.statusText;
        json.title = title;
        json.method = http_method;
      };

      if (parseInt(response.status) > 299) {
        throw new Error(`Recharge request failed with code ${response.status}: "${response.statusText}"`);
      };

      return json;
    });
};

const delay = (t) => {
  return new Promise(resolve => setTimeout(resolve, t));
};

/*
 * @function getSubscription
 * @return { subscription } 
 */
export const getSubscription = async (id) => {
  const { subscription } = await makeRechargeQuery({
    method: "GET",
    path: `subscriptions/${id}`,
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
  /*
  const result = await makeRechargeQuery({
    method: "PUT",
    path: `subscriptions/${id}`,
    body: JSON.stringify(body)
  });
  */
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
  /*
  const result = await makeRechargeQuery({
    method: "POST",
    path: `subscriptions/${id}/set_next_charge_date`,
    body: JSON.stringify({ date })
  });
  */
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
      } else {
        options.method = "PUT"; // updating a subscription
        options.title = update.title;
        const body = {
          properties: update.properties,
          quantity: update.quantity,
        };
        if (Object.hasOwnProperty.call(update, "price")) body.price = update.price;
        options.body = JSON.stringify(body);
      };
    } else {
      // creating a new subscription requires post to subscriptions
      options.title = update.product_title;
      options.path = "subscriptions";
      options.method = "POST";
      options.body = JSON.stringify(update);
    };

    options.io = io;
    options.session_id = session_id;
    // need to pass in the finish call so to know that all have completed and we
    // can emit "finished"
    if (i === updates.length - 1) {
      options.finish = true;
    };
    const result = await makeRechargeQuery(options);

    if (options.method === "DELETE") {
      console.log("DELETE", result);
    };
  };
  return;
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
      ["purchase_item_id", subscription_id ],
      ["status", "success" ],
      ["limit", 1 ],
    ]
  });
  const charge = (charges.length) ? charges[0] : null;
  if (charge) {
    const { order } = await makeShopQuery({
      path: `orders/${charge.external_order_id.ecommerce}.json`,
      fields: ["current_total_price", "order_number", "tags", "line_items"]
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
      .filter(el => el.product_id === product_id)
      .map(el => {
      return {
        name: el.name,
        properties: el.properties,
        price: el.price,
        product_id: el.product_id
      };
    });
    return order;
  };
  return {}; // always return an object
};
