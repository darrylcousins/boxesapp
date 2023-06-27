/*
 * @module api/log/customer-logs.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function log/customer-logs.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
import { sortObjectArrayByKey } from "../../lib/helpers.js";

export default async (req, res, next) => {
  const { customer_id, subscription_id } = req.query;

  const query = {};
  query[`meta.recharge.customer_id`] = parseInt(customer_id);
  query[`meta.recharge.subscription_id`] = parseInt(subscription_id);


  const collection = _mongodb.collection("logs");
  try {
    const result = await collection.find(query).sort({ timestamp: -1 }).toArray();
    //
    // not to many queries are expected so just aggregate in a loop
    // should be smart enough to add this to the pipeline
    for (const item of [ ...result ]) {
      if (item.meta.recharge.shopify_order_id) {
        const res = await collection.find({"meta.order.shopify_order_id": parseInt(item.meta.recharge.shopify_order_id) }).toArray();
        for (const item of res) {
          result.push(item);
        };
      }
    };

    const logs = sortObjectArrayByKey(result, "timestamp").reverse();

    res.status(200).json({ logs });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

