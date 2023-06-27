/*
 * @module api/recharge/recharge-update-charge-date.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionUpdatedMail from "../../mail/subscription-updated.js";
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { delay } from "../../lib/helpers.js";

/*
 * @function recharge/recharge-update-charge-date.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const data = req.body;
  const attributes = JSON.parse(data.attributes);
  const includes = JSON.parse(data.includes);
  delete data.attributes;
  delete data.includes;

  const meta = {
    recharge: {
      customer_id: attributes.customer.id,
      shopify_customer_id: attributes.customer.external_customer_id.ecommerce,
      email: attributes.customer.email,
      subscription_id: attributes.subscription_id,
      next_delivery: data.nextdeliverydate,
      next_charge: data.nextchargedate,
    },
  };

  let delivered;
  const updates = includes.map(el => {
    const properties = [ ...el.properties ];
    delivered = properties.find(el => el.name === "Delivery Date");
    delivered.value = data.nextdeliverydate;
    const id = el.subscription_id;
    return { id, properties };
  });

  try {

    let chargeDate = new Date(Date.parse(data.nextchargedate));
    const offset = chargeDate.getTimezoneOffset()
    chargeDate = new Date(chargeDate.getTime() - (offset*60*1000))
    const nextChargeDate = chargeDate.toISOString().split('T')[0];

    // get the charge to pass back to page to refresh the subscription display
    /*
    const chargeQuery = await makeRechargeQuery({
      method: "GET",
      path: `charges/${attributes.charge_id}`,
    });

    let charge;
    if (Object.hasOwnProperty.call(chargeQuery, "charge")) {
      charge = chargeQuery.charge;
    } else {
      // need to manufacture the charge
      charge = {};
    };
    */
    let charge = {};
    charge.line_items = [];
    charge.scheduled_at = data.nextchargedate;
    charge.id = null;

    let body;
    for (const [idx, update] of updates.entries()) {
      body = { date: nextChargeDate };
      const result = await makeRechargeQuery({
        method: "POST",
        path: `subscriptions/${update.id}/set_next_charge_date`,
        body: JSON.stringify(body),
      }).then(async (res) => {
        body = { properties: update.properties };
        if (idx === updates.length - 1) {
          body.commit = true; // on last update only
        };
        console.log(body);
        await delay(500);
        return await makeRechargeQuery({
          method: "PUT",
          path: `subscriptions/${res.subscription.id}`,
          body: JSON.stringify(body),
        });
      });
      //console.log(result);
      result.subscription.purchase_item_id = result.subscription.id;
      result.subscription.images = { small: null };
      result.subscription.unit_price = result.subscription.price;
      result.subscription.title = result.subscription.product_title;
      const price = parseFloat(result.subscription.price) * result.subscription.quantity;
      result.subscription.total_price = `${price.toFixed(2)}`;
      charge.line_items.push(result.subscription);
      await delay(800); // or use PromiseThrottle?
    };

    _logger.notice(`Recharge update charge date.`, { meta });

    const mail = {
      subscription_id: attributes.subscription_id,
      attributes,
      includes,
      nextChargeDate: data.nextchargedate,
      nextDeliveryDate: data.nextdeliverydate,
    };
    await subscriptionUpdatedMail(mail);

    // res.status(200).json({ success: true, nextchargedate: data.nextchargedate, nextdeliverydate: data.nextdeliverydate });
    res.status(200).json({
      success: true,
      action: "updated",
      subscription_id: attributes.subscription_id,
      charge,
    });

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

