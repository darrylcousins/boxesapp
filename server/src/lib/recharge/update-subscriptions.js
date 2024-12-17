/*
 * @module lib/recharge/update-subscriptions.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "./helpers.js";
import { delay } from "../helpers.js";

/*
 * @function capitalize
 * Helper method
 */
const capitalize = (word) => {
  return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
};

/*
 * @function updateSubscriptions
 * @param { updates }
 *
 * Will need to create 3 batches: // the cancel I'll put in another method
 * 1. batch_type:bulk_subscriptions_create
 * 2. batch_type:bulk_subscriptions_update
 * 3. batch_type:bulk_subscriptions_delete
 * 4. batch_type:subscription_cancel
 */
export default async ({ address_id, updates, req, io, session_id }) => {

  const batches = {
    bulk_subscriptions_update: { body: {
      address_id,
      subscriptions: [],
    }},
    bulk_subscriptions_create: { body: {
      address_id,
      subscriptions: [],
    }},
    bulk_subscriptions_delete: { body: {
      address_id,
      subscriptions: [],
    }},
    subscription_cancel: [],
  };
  for (const update of updates) {
    delete update.shopify_product_id;
    if (Object.hasOwn(update, "cancellation_reason")) {
      if (io) io.emit("progress", `Cancelling ${update.title}`);
      delete update.title;
      batches.subscription_cancel.push({ body: update });
    } else if (Object.hasOwn(update, "subscription_id")) {
      if (update.quantity === 0) {
        batches.bulk_subscriptions_delete.body.subscriptions.push({ id: update.subscription_id });
        if (io) io.emit("progress", `Deleting ${update.title}`);
      } else {
        const body = {
          id: update.subscription_id,
        };
        if (io) io.emit("progress", `Updating ${update.title}`);
        delete update.title;
        // the update data is fluid in what data it receives
        if (Object.hasOwn(update, "next_charge_scheduled_at")) body.next_charge_scheduled_at = update.next_charge_scheduled_at;
        if (Object.hasOwn(update, "quantity")) body.quantity = update.quantity;

        // may not have properties from change-subscription if only an interval change
        if (Object.hasOwn(update, "properties")) body.properties = update.properties;

        // the following are only updates on create-subscription and change-subscription api calls
        if (Object.hasOwn(update, "price")) body.price = update.price;
        if (Object.hasOwn(update, "order_day_of_week")) body.order_day_of_week = update.order_day_of_week.toString();
        if (Object.hasOwn(update, "charge_interval_frequency")) body.charge_interval_frequency = update.charge_interval_frequency;
        if (Object.hasOwn(update, "order_interval_frequency")) body.order_interval_frequency = update.order_interval_frequency.toString();
        if (Object.hasOwn(update, "order_interval_unit")) body.order_interval_unit = update.order_interval_unit;
        if (Object.hasOwn(update, "external_product_id")) body.external_product_id = update.external_product_id;
        if (Object.hasOwn(update, "product_title")) body.product_title = update.product_title;
        if (Object.hasOwn(update, "variant_title")) body.variant_title = update.variant_title;
        if (Object.hasOwn(update, "external_variant_id")) body.external_variant_id = update.external_variant_id;
        if (Object.hasOwn(update, "external_variant_id")) body.shopify_variant_id = parseInt(update.external_variant_id.ecommerce);
        if (Object.hasOwn(update, "external_variant_id")) body.use_external_variant_defaults = true;
        if (Object.hasOwn(update, "sku")) body.sku = update.sku;
        if (Object.hasOwn(update, "sku")) body.use_external_variant_defaults = true;
        if (Object.hasOwn(update, "sku")) body.shopify_variant_id = parseInt(update.external_variant_id.ecommerce);
        batches.bulk_subscriptions_update.body.subscriptions.push(body);
      };
    } else {
      // creating a new subscription requires post to subscriptions
      if (io) io.emit("progress", `Creating ${update.title}`);
      delete update.title;
      // the create data is expected to be full and correct
      update.id = update.subscription_id;
      update.use_external_variant_defaults = true;
      update.shopify_variant_id = parseInt(update.external_variant_id.ecommerce);
      update.charge_interval_frequency = update.charge_interval_frequency.toString();
      update.shipping_interval_frequency = update.charge_interval_frequency.toString();
      batches.bulk_subscriptions_create.body.subscriptions.push(update);
    };
  };

  let batch;
  let batch_id;
  let tasks_result;
  let process_result;
  const async_batches = req.app.get("async_batches");
  // create the batch and add the tasks
  for (const [batch_type, tasks] of Object.entries(batches)) {
    const taskList = batch_type === "subscription_cancel" ? tasks : tasks.body.subscriptions;

    // if only one in the tasks then don't use batches
    if (taskList.length === 1) {
      const options = {};
      const update = taskList[0];
      options.path = `subscriptions/${update.id}`;

      if (batch_type === "bulk_subscriptions_delete") {
        options.method = "DELETE";
        options.title = `Deleting ${update.id}`;
      } else if (batch_type === "bulk_subscriptions_update") {
        options.method = "PUT";
        options.title = `Updating ${update.id}`;
        options.body = JSON.stringify(update);
      } else if (batch_type === "bulk_subscriptions_create") {
        options.path = "subscriptions";
        options.method = "POST";
        options.title = `Creating ${update.product_title}`;
        options.body = JSON.stringify(update);
      } else if (batch_type === "subscription_cancel") {
        console.log("Cancelling", update);
        options.path = `subscriptions/${update.body.subscription_id}/cancel`;
        options.method = "POST";
        options.title = `Cancelling ${update.body.subscription_id}`;
        options.body = JSON.stringify(update.body);
      };
      options.io = io;
      options.session_id = session_id;
      await makeRechargeQuery(options);

    } else if (taskList.length > 0) {

      // get batch id and push tasks
      batch = await makeRechargeQuery({
        method: "POST",
        path: "async_batches",
        body: JSON.stringify({batch_type}),
        title: `Fetching batch for ${batch_type}`,
        io,
        session_id
      });
      batch_id = batch.async_batch.id;
      if (batch_id) {
        const taskPost = batch_type === "subscription_cancel" ? { tasks } : { tasks: [ tasks ] };
        tasks_result = await makeRechargeQuery({
          method: "POST",
          path: `async_batches/${batch_id}/tasks`,
          body: JSON.stringify(taskPost),
          title: `Adding ${batch_type} tasks to batch ${batch_id}`,
          io,
          session_id
        });
        const type = batch_type === "subscription_cancel" ? "cancel" : batch_type.split("_")[2];

        // pushing to a global list
        async_batches.push([batch_id, type]);
      };
    };
  };

  // if more than one then we need to wait for completion i.e. the processed webhook
  // put a time out on the interval
  const counter = new Date();

  const processBatch = async (batch, batch_ids, session_id) => {
    const [batch_id, batch_type] = batch;
    
    // create entry that will be deleted on async_batches/processed webhook
    const doc = {
      id: batch_id,
      session_id,
      action: capitalize(batch_type),
      timestamp: new Date(),
    };
    const entry = _mongodb.collection("pending_batches").insertOne(doc);

    process_result = await makeRechargeQuery({
      method: "POST",
      path: `async_batches/${batch_id}/process`,
      body: JSON.stringify({}),
      title: `Processing batch ${batch_id} (${batch_type})`,
      io,
      session_id
    });

    if (async_batches.length === 0) {
      // all done, the entry will be removed by the webhook
      console.log("All done with the processing");
    } else {
      const timer = setInterval(async () => {
        const now = new Date();
        const millis = now.getTime() - counter.getTime();
        const minutes = Math.floor(millis / 60000);
        if (minutes > 20 && timer) {
          await _mongodb.collection("pending_batches").deleteMany({id: batch_id});
          clearInterval(timer);
          // should log this too as an error so I can check up on it
          _logger.error({message: "Interval timed out at 20 minutes", meta: { batch_id }});
        }
        // thinking I should check for any batch to avoid multiple processes trying to process a batch
        const entry = await _mongodb.collection("pending_batches").findOne({id: batch_id});
        if (!entry) {
          console.log("Finished", batch_id);
          clearInterval(timer);
          const check = await _mongodb.collection("pending_batches").findOne({});
          if (!check) { // another process may have picked up on the batch
            batch = async_batches.shift();
            _logger.notice({message: "Processing next batch", meta: { recharge: { batch, batch_ids }}});
            await processBatch(batch, batch_ids, session_id);
          };
        };
      }, 500);
    };
  };

  // first check for any current batches, i.e. multiple webhooks coming in
  // should be able to check for any entry at all?
  // if one is there then the processBatch self call is running 
  const now = new Date();
  now.setMinutes(now.getMinutes() - 30)
  // use timestamp say 30 minutes log error if any older stale ids

  const check = await _mongodb.collection("pending_batches").find({ timestamp: { "$gte": now }}).toArray();
  if (check.length === 0) {
    let first_batch = async_batches.shift();
    if (first_batch) await processBatch(first_batch, async_batches, session_id);
  };

  const stale = await _mongodb.collection("pending_batches").find({timestamp: { "$lte": now }}).toArray();
  if (stale.length > 0) {
    _logger.error({message: "Found stale async_batches", meta: stale});
  };

  return;
};

