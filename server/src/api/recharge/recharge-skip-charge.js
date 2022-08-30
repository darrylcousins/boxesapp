/*
 * @module api/recharge/recharge-skip-charge.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery, getSubscription, updateSubscription } from "../../lib/recharge/helpers.js";

/*
 * @function recharge/recharge-skip-charge.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const attributes = JSON.parse(req.body.attributes);
  const includes = JSON.parse(req.body.includes);

  const meta = {
    recharge: {
      customer_id: attributes.customer.id,
      shopify_customer_id: attributes.customer.external_customer_id.ecommerce,
      email: attributes.customer.email,
      charge_id: attributes.charge_id,
      address_id: attributes.address_id,
      subscription_id: attributes.subscription_id,
    },
  };

  try {

    const charge_id = attributes.charge_id;
    const purchase_item_ids = includes.map(el => el.subscription_id);

    const deliveredObj = new Date(Date.parse(attributes.nextDeliveryDate));
    deliveredObj.setDate(deliveredObj.getDate() + attributes.days);
    const updatedDelivery = deliveredObj.toDateString();

    const chargeObj = new Date(Date.parse(attributes.nextChargeDate));
    chargeObj.setDate(chargeObj.getDate() + attributes.days);
    const updatedCharge = chargeObj.toDateString();

    for (const id of purchase_item_ids) {
      const subn = await getSubscription(id, 100); // delay each to avoid pushing too many calls
      if (subn) { // not happy with this, I need to sync things better on the front end
        const props = [ ...subn.properties ];
        const dateItem = props.find(el => el.name === "Delivery Date");
        const dateIdx = props.indexOf(dateItem);
        dateItem.value = updatedDelivery;
        props[dateIdx] = dateItem;
        const res = await updateSubscription(id, { properties: props }, 500);
      };
    };

    const result = await makeRechargeQuery({
      method: "POST",
      path: `charges/${charge_id}/skip`,
      body: JSON.stringify({ purchase_item_ids }),
    });

    res.status(200).json({ success: true });
    _logger.notice(`Recharge skip charge.`, { meta });
    return;

  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
