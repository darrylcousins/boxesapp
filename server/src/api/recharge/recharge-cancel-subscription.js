/*
 * @module api/recharge/recharge-cancel-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

//import fs from "fs";
import subscriptionCancelledMail from "../../mail/subscription-cancelled.js";
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { delay } from "../../lib/helpers.js";
/*
 * @function recharge/recharge-cancel-subscription.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  /* for creating mail - can be deleted
  const mail = {};
  mail.subscription_id = parseInt(req.body.subscription_id);
  mail.includes = JSON.parse(req.body.includes);
  mail.attributes = JSON.parse(req.body.attributes);
  fs.writeFileSync("recharge.cancel.json", JSON.stringify(mail, null, 2));
  res.status(200).json({ success: true });
  return;
  */

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
        cancellation_reason_comments: "BoxesApp cancel subscription",
        cancellation_reason: cancellation_reason,
      };
      if (id !== subscription_id) body.send_email = false;
      const result = await makeRechargeQuery({
        method: "POST",
        path: `subscriptions/${id}/cancel`,
        body: JSON.stringify(body),
      });
      await delay(200);
    };

    const data = { subscription_id, attributes, includes };
    await subscriptionCancelledMail(data);

    res.status(200).json({ success: true, action: "cancelled", subscription_id });
    _logger.notice(`Recharge cancel subscription.`, { meta });

  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

