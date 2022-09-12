/*
 * @module api/recharge/recharge-update-charge-date.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";

const delay = (t) => {
  return new Promise(resolve => setTimeout(resolve, t));
};


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

  const updates = includes.map(el => {
    const properties = [ ...el.properties ];
    const delivered = properties.find(el => el.name === "Delivery Date");
    delivered.value = data.nextdeliverydate;
    const id = el.subscription_id;
    return { id, properties };
  });

  try {

    res.status(200).json({ success: true, nextchargedate: data.nextchargedate, nextdeliverydate: data.nextdeliverydate });
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  try {

    let chargeDate = new Date(Date.parse(data.nextchargedate));
    const offset = chargeDate.getTimezoneOffset()
    chargeDate = new Date(chargeDate.getTime() - (offset*60*1000))
    const nextChargeDate = chargeDate.toISOString().split('T')[0];

    const subscription_ids = updates.map(el => el.id);

    let body;
    for (const update of updates) {
      const id = update.id;
      body = { properties: update.properties };
      const result = await makeRechargeQuery({
        method: "PUT",
        path: `subscriptions/${id}`,
        body: JSON.stringify(body),
      });
      console.log(result);
      await delay(3000);
    };

    body = { date: nextChargeDate };
    for (const id of subscription_ids) {
      const result = await makeRechargeQuery({
        method: "POST",
        path: `subscriptions/${id}/set_next_charge_date`,
        body: JSON.stringify(body),
      });
      console.log(result);
      await delay(3000);
    };

    _logger.notice(`Recharge update charge date.`, { meta });
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

