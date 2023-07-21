/*
 * @module api/recharge/customers-update.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function log/customers-update.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * Storing customers locally. This will update against recharge.
 */
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";

export default async (req, res, next) => {

  const collection = _mongodb.collection("customers");
  try {
    const result = await makeRechargeQuery({
      path: `customers`,
      query: [
        ["limit", 250 ],
      ]
    });
    const { customers, next_cursor, previous_cursor } = result;

    if (next_cursor) {
      console.log(`Collect customers, got more than 250 ${customers.length}`);
      // XXX must code for this now while I still can
    };

    for (const el of customers) {

      const charge_list = [];

      if (el.subscriptions_active_count > 0) {
        try {
          const res = await makeRechargeQuery({
            path: `charges`,
            query: [
              ["customer_id", el.id ],
              ["status", "queued" ],
              ["sort_by", "scheduled_at-asc" ],
            ]
          });

          if (res.charges) {
            for (const c of res.charges) {
              console.log(c.id, c.scheduled_at, c.status);
              charge_list.push([c.id, c.scheduled_at]);
            };
          };
        } catch(err) {
          _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
        };
      };

      const doc = {
        first_name: el.first_name,
        last_name: el.last_name,
        email: el.email,
        recharge_id: el.id,
        shopify_id: parseInt(el.external_customer_id.ecommerce),
        subscriptions_active_count: el.subscriptions_active_count,
        subscriptions_total_count: el.subscriptions_total_count,
        charge_list,
      };
      const result = await collection.updateOne(
        { recharge_id: parseInt(doc.recharge_id) },
        { "$set" : doc },
        { "upsert": true }
      );
    };

    res.status(200).json({ success: true });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};



