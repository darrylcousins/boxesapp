/*
 * @module api/recharge/recharge-reactivate-subscription.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import subscriptionReactivatedMail from "../../mail/subscription-reactivated.js";
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { delay } from "../../lib/helpers.js";

/*
 * @function recharge/recharge-reactivate-subscription.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const data = req.body;
  const box = JSON.parse(data.box);
  const included = JSON.parse(data.included);
  const attributes = box.properties.reduce(
    (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value }),
    {});
  delete data.included;
  delete data.box;
  const includes = included.map(el => `${el.id}`);
  includes.push(box.id);
  attributes["Delivery Date"] = data.nextdeliverydate;

  const meta = {
    recharge: {
      customer_id: box.customer_id,
      address_id: box.address_id,
      subscription_id: box.id,
    },
  };

  try {
    let properties;
    let update;
    const status = "active";
    let chargeDate = new Date(Date.parse(data.nextchargedate));
    const offset = chargeDate.getTimezoneOffset()
    chargeDate = new Date(chargeDate.getTime() - (offset*60*1000))
    const nextChargeDate = chargeDate.toISOString().split('T')[0];

    let final;
    for (const [idx, id] of includes.entries()) {
      if (id === box.id) {
        properties = Object.entries(attributes).map(([name, value]) => {
          if (value === null) value = "";
          return { name, value };
        });
      } else {
        properties = [
          { name: "Delivery Date", value: data.nextdeliverydate },
          { name: "Add on product to", value: box.product_title },
          { name: "box_subscription_id", value: `${box.id}` },
        ];
      };
      const result = await makeRechargeQuery({
        method: "POST",
        path: `subscriptions/${id}/activate`,
      }).then(async (res1) => {
        await delay(500);
        return await makeRechargeQuery({
          method: "POST",
          path: `subscriptions/${res1.subscription.id}/set_next_charge_date`,
          body: JSON.stringify({ date: nextChargeDate }),
        }).then(async (res2) => {
          await delay(500);
          update = {
            properties,
            //status,
          };
          if (idx === includes.length - 1) {
            update.commit = true;
          };
          console.log(update);
          return await makeRechargeQuery({
            method: "PUT",
            path: `subscriptions/${res2.subscription.id}`,
            body: JSON.stringify(update),
          });
        });
      });
      /*
      console.log(result.subscription.status)
      console.log(result.subscription.properties)
      console.log(result.subscription.next_charge_scheduled_at)
      */
      if (result.subscription.id === box.id) {
        final = { ...result.subscription };
      };
      await delay(800);
    };

    const mail = {
      subscription_id: box.id,
      box,
      included,
      nextChargeDate: data.nextchargedate,
      nextDeliveryDate: data.nextdeliverydate,
    };
    await subscriptionReactivatedMail(mail);

    res.status(200).json({
      success: true,
      action: "reactivated",
      subscription_id: box.id,
      scheduled_at: final.next_charge_scheduled_at,
    });
    _logger.notice(`Recharge reactivate subscription.`, { meta });

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


