/*
 * @module api/recharge/recharge-delete-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionDeletedMail from "../../mail/subscription-deleted.js";
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { delay } from "../../lib/helpers.js";

/*
 * @function recharge/recharge-delete-subscription.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const box = JSON.parse(req.body.box);
  const included = JSON.parse(req.body.included);

  const meta = {
    recharge: {
      customer_id: box.customer_id,
      address_id: box.address_id,
      subscription_id: box.id,
    },
  };

  const includes = included.map(el => `${el.id}`);
  includes.push(box.id);

  try {

    for (const id of includes) {
      const result = await makeRechargeQuery({
        method: "DELETE",
        path: `subscriptions/${id}`,
        body: JSON.stringify({ send_email: true }),
      });
      await delay(500);
    };

    const mail = {
      subscription_id: box.id,
      box,
      included,
    };
    await subscriptionDeletedMail(mail);

    res.status(200).json({ success: true, action: "deleted", subscription_id: box.id });
    _logger.notice(`Recharge delete subscription.`, { meta });

  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

