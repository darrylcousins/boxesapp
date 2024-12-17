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

  const { recharge_id } = req.params;

  try {
    const { customer } = await makeRechargeQuery({
      path: `customers/${recharge_id}`,
      title: "Get customer for customer update",
    });

    if (!customer) {
      return res.status(200).json({ error: "Not found" });
    };

    const charge_list = [];

    if (customer.subscriptions_active_count > 0) {
      try {
        const res = await makeRechargeQuery({
          path: `charges`,
          query: [
            ["customer_id", customer.id ],
            ["status", "queued" ],
            ["sort_by", "scheduled_at-asc" ],
          ],
          title: "Get charges for customer update",
        });

        if (res.charges) {
          for (const c of res.charges) {
            charge_list.push([c.id, c.scheduled_at, c.address_id]);
          };
        };
      } catch(err) {
        _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      };
    };

    const doc = {
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      recharge_id: customer.id,
      shopify_id: parseInt(customer.external_customer_id.ecommerce),
      subscriptions_active_count: customer.subscriptions_active_count,
      subscriptions_total_count: customer.subscriptions_total_count,
      charge_list,
    };
    const collection = _mongodb.collection("customers");
    const result = await collection.updateOne(
      { recharge_id: parseInt(doc.recharge_id) },
      { "$set" : doc },
      { "upsert": true }
    );

    res.status(200).json({ success: true });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};



