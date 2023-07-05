/**
 * Provide some helper methods for recharge webhooks
 *
 * @module webhooks/recharge/helpers
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import fs from "fs";

/*
 * @ function getMetaForCharge
 */
export const getMetaForCharge = (charge, topic) => {
  /* Start logging all details */
  const rc_subscription_ids = [];
  let properties;
  for (const line_item of charge.line_items) {
    if (line_item.properties.some(el => el.name === "Including")) {
      properties = line_item.properties.reduce(
        (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
        {});
    };
    rc_subscription_ids.push({
      shopify_product_id: parseInt(line_item.external_product_id.ecommerce),
      subscription_id: parseInt(line_item.purchase_item_id),
      quantity: parseInt(line_item.quantity),
    });
  };
  const meta = {
    recharge: {
      topic,
      charge_id: charge.id,
      customer_id: charge.customer.id,
      email: charge.customer.email,
      address_id: charge.address_id,
      charge_status: charge.status,
      shopify_order_id: parseInt(charge.external_order_id.ecommerce),
      charge_processed_at: charge.processed_at,
      scheduled_at: charge.scheduled_at,
      rc_subscription_ids,
    },
  };
  if (properties) {
    delete properties.Likes;
    delete properties.Dislikes;
    for (const [key, value] of Object.entries(properties)) {
      if (key === "box_subscription_id") continue;
      meta.recharge[key] = value;
    };
    if (Object.hasOwnProperty.call(properties, "box_subscription_id")) {
      meta.recharge.subscription_id = parseInt(properties.box_subscription_id);
    };
  };
  /* End logging all details */

  return meta;
};

/*
 * @ function getMetaForSubscription
 */
export const getMetaForSubscription = (subscription, topic) => {
  /* Start logging all details */
  const properties = subscription.properties.reduce(
    (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value === null ? "" : curr.value }),
    {});
  const rc_subscription_id = {
    shopify_product_id: parseInt(subscription.external_product_id.ecommerce),
    subscription_id: parseInt(subscription.id),
    quantity: parseInt(subscription.quantity),
  };
  const meta = {
    recharge: {
      topic,
      item_subscription_id: subscription.id,
      customer_id: subscription.customer_id,
      address_id: subscription.address_id,
      title: subscription.product_title,
      variant_title: subscription.variant_title,
      next_charge_date: subscription.next_charge_scheduled_at,
      rc_subscription_id,
      shopify_product_id: parseInt(subscription.external_product_id.ecommerce),
      quantity: parseInt(subscription.quantity),
    }
  };
  delete properties.Likes;
  delete properties.Dislikes;
  for (const [key, value] of Object.entries(properties)) {
    if (key === "box_subscription_id") continue;
    meta.recharge[key] = value;
  };
  if (Object.hasOwnProperty.call(properties, "box_subscription_id")) {
    meta.recharge.subscription_id = parseInt(properties.box_subscription_id);
  };
  /* End logging all details */

  return meta;
};

/*
 * @ function writeFile
 */
export const writeFile = (json, type, topic) => {

  if (process.env.NODE_ENV !== "development") return;

  /* development logging stuff */
  const d = new Date();
  const s = `${d.getHours()}-${d.getMinutes()}-${d.getSeconds()}`;
  try {
    fs.writeFileSync(`recharge.${type}-${s}-${json.id}-${topic}.json`, JSON.stringify(json, null, 2));
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
  /* end development logging stuff */
};

/*
 * @ function writeFileForSubscription
 */
export const writeFileForSubscription = (subscription, topic) => {

  writeFile(subscription, "subscription", topic);

};

/*
 * @ function writeFileForCharge
 */
export const writeFileForCharge = (charge, topic) => {

  writeFile(charge, "charge", topic);

};

/*
 * @ function writeFileForOrder
 */
export const writeFileForOrder = (order, topic) => {

  writeFile(order, "order", topic);

};

