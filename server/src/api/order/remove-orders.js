/*
 * @module api/order/remove-orders.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function order/remove-orders.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const { sources, delivered } = req.body;
  const query = {delivered, source: {$in: sources }};
  try {
    const result = await _mongodb.collection("orders").deleteMany(query);
    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
