/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module lib/recharge/log-webhook.js
 */

/*
 * @function logWebhook
 * Helper method for debugging the flow of updates made to recharge so that we
 * can allow the user to further edit their box. See registry.js.
 * The result is true or false. Webhook handlers return false if no action was
 * taken or an error occurred.
*/
export default async (topic, body, key) => {
  const dt = new Date();
  let month = ("0" + (dt.getMonth() + 1)).slice(-2);
  let day = ("0" + dt.getDate()).slice(-2);
  let printDate = `${dt.getFullYear()}-${month}-${day} ${dt.getHours()}:${dt.getMinutes()}:${dt.getSeconds()}`;

  let data = {};
  let topicLower = topic.toLowerCase().replace("_", "/")
  if (topic === "CHARGE_DELETED") {
    data.charge_id = body.charge.id;
  } else if (topic.startsWith("PRODUCT")) {
    let product;
    if (Object.hasOwn(body, "product")) {
      product = body.product;
    } else {
      product = body;
    };
    data.product_id = product.id;
    data.title = product.title;
  } else if (topic.startsWith("ORDER") && key === "shopify") {
    let order;
    if (Object.hasOwn(body, "order")) {
      order = body.order;
    } else {
      order = body;
    };
    let deliver_at;
    let box_titles = [];
    let box_subscription_ids = [];
    let rc_subscription_ids = [];
    for (const line_item of order.line_items) {
      const properties = line_item.properties.reduce(
        (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
        {});
      if (Object.hasOwn(properties, "Including")) {
        box_titles.push(line_item.title);
        deliver_at = properties["Delivery Date"];
      };
      const rc_ids = {
        shopify_product_id: line_item.id,
        quantity: line_item.quantity,
        title: line_item.name,
        properties,
      };
      if (Object.hasOwn(properties, "box_subscription_id")) {
        box_subscription_ids.push(parseInt(properties["box_subscription_id"]));
        rc_ids.box_subscripion_id = parseInt(properties["box_subscription_id"]);
      };
      rc_subscription_ids.push(rc_ids);
    };
    data = {
      box_titles,
      box_subscription_ids: Array.from(new Set(box_subscription_ids)),
      rc_subscription_ids,
    };
    data.order_id = order.id;
    data.created_at = order.created_at;
    data.contact_email = order.contact_email;
  } else if (topic.startsWith("ORDER") && key === "recharge") {
    let order;
    if (Object.hasOwn(body, "order")) {
      order = body.order;
    } else {
      order = body;
    };
    let deliver_at;
    let box_titles = [];
    let box_subscription_ids = [];
    let rc_subscription_ids = [];
    for (const line_item of order.line_items) {
      const properties = line_item.properties.reduce(
        (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
        {});
      if (Object.hasOwn(properties, "Including")) {
        box_titles.push(line_item.title);
        box_subscription_ids.push(line_item.purchase_item_id);
        deliver_at = properties["Delivery Date"];
      };
      rc_subscription_ids.push({
        shopify_product_id: line_item.external_product_id.ecommerce,
        subscription_id: line_item.purchase_item_id,
        quantity: line_item.quantity,
        title: line_item.title,
        box_subscription_id: parseInt(properties["box_subscription_id"]),
        properties,
      });
    };
    data = {
      charge_id: order.charge.id,
      address_id: order.address_id,
      customer_id: order.customer.id,
      scheduled_at: order.scheduled_at.split("T")[0],
      status: order.status,
      deliver_at,
      box_titles,
      box_subscription_ids,
      rc_subscription_ids,
    };
  } else if (topic.startsWith("CHARGE")) {
    let charge;
    if (Object.hasOwn(body, "charge")) {
      charge = body.charge;
    } else {
      charge = body;
    };
    let deliver_at;
    let box_titles = [];
    let box_subscription_ids = [];
    let rc_subscription_ids = [];
    for (const line_item of charge.line_items) {
      const properties = line_item.properties.reduce(
        (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
        {});
      if (Object.hasOwn(properties, "Including")) {
        box_titles.push(line_item.title);
        box_subscription_ids.push(line_item.purchase_item_id);
        deliver_at = properties["Delivery Date"];
      };
      rc_subscription_ids.push({
        shopify_product_id: line_item.external_product_id.ecommerce,
        subscription_id: line_item.purchase_item_id,
        quantity: line_item.quantity,
        title: line_item.title,
        box_subscription_id: parseInt(properties["box_subscription_id"]),
        properties,
      });
    };
    data = {
      charge_id: charge.id,
      address_id: charge.address_id,
      customer_id: charge.customer.id,
      scheduled_at: charge.scheduled_at,
      status: charge.status,
      deliver_at,
      box_titles,
      box_subscription_ids,
      rc_subscription_ids,
    };
  } else if (topic.startsWith("SUBSCRIPTION")) {
    let subscription;
    if (Object.hasOwn(body, "subscription")) {
      subscription = body.subscription;
    } else {
      subscription = body;
    };
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
      box_subscription_id: parseInt(properties["box_subscription_id"]),
      properties,
    };
  } else if (topic.startsWith("ASYNC")) {
    topicLower = "async_batches/processed";
    let async_batch;
    if (Object.hasOwn(body, "async_batch")) {
      async_batch = body.async_batch;
    } else {
      async_batch = body;
    };
    data = async_batch;
  };
  const meta = {};
  meta[key] = data;
  _logger.notice(`Webhook received ${topicLower}.`, { meta });
};

