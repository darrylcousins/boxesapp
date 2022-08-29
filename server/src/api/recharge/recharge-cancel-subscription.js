/*
 * @module api/recharge/recharge-cancel-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
/*
 * @function recharge/recharge-cancel-subscription.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  try {
    const cancellation_reason = req.body.cancellation_reason;
    const includes = JSON.parse(req.body.includes);
    const attributes = JSON.parse(req.body.attributes);
    const subscription_id = parseInt(req.body.subscription_id);
    const meta = {
      recharge: {
        customer_id: attributes.customer.id,
        shopify_customer_id: parseInt(attributes.customer.external_customer_id.ecommerce),
        email: attributes.customer.email,
        address_id: attributes.address_id,
        subscription_id: attributes.subscription_id,
      },
    };

    for (const id of includes.map(el => el.subscription_id)) {
      const body = {
        cancellation_reason: "BoxesApp cancel subscription",
        cancellation_reason_comments: cancellation_reason,
        send_email: Boolean(id === subscription_id),
      };
      const result = await makeRechargeQuery({
        method: "POST",
        path: `subscriptions/${id}/cancel`,
        body: JSON.stringify(body),
      });
      console.log(JSON.stringify(result, null, 2));
    };
    _logger.notice(`Recharge cancel subscription.`, { meta });
    res.status(200).json({ success: true });

  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

