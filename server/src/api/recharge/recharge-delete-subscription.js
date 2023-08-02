/*
 * @module api/recharge/recharge-delete-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionActionMail from "../../mail/subscription-action.js";
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { sortObjectByKeys } from "../../lib/helpers.js";

/*
 * @function recharge/recharge-delete-subscription.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const box = JSON.parse(req.body.box);
  const includes = JSON.parse(req.body.includes);
  const attributes = JSON.parse(req.body.attributes);

  const topicLower = "subscription/reactivated";
  const meta = {
    recharge: {
      label: "DELETE",
      topic: topicLower,
      charge_id: null,
      customer_id: box.customer_id,
      address_id: box.address_id,
      subscription_id: box.id,
    }
  };

  const included = includes.map(el => `${el.id}`);

  try {

    for (const id of included) {
      const result = await makeRechargeQuery({
        method: "DELETE",
        path: `subscriptions/${id}`,
        body: JSON.stringify({ send_email: false }),
        title: `Delete ${id}`
      });
    };

    // update for email template
    for (const el of includes) {
      el.title = el.product_title;
      el.shopify_product_id = el.external_product_id.ecommerce;
    };

    const mail = {
      type: "deleted",
      attributes,
      includes,
    };
    await subscriptionActionMail(mail);

    meta.recharge = sortObjectByKeys(meta.recharge);
    _logger.notice(`Recharge customer api request ${topicLower}.`, { meta });
    res.status(200).json({ success: true, action: "deleted", subscription_id: box.id });

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

