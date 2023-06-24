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
export default async (req, res, next) => {
  const { customer_id, subscription_id } = req.query;

  const query = {};
  query[`meta.recharge.customer_id`] = parseInt(customer_id);
  query[`meta.recharge.subscription_id`] = parseInt(subscription_id);


  const collection = _mongodb.collection("logs");
  try {
    const logs = await collection.find(query).sort({ timestamp: -1 }).toArray();
    res.status(200).json({ logs });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

