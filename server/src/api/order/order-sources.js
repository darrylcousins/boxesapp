/*
 * @module api/order/order-sources.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function order/order-sources.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const collection = _mongodb.collection("orders");
  const query = req.body;
  _logger.info(JSON.stringify(req.body, null, 2));
  const response = Object();
  try {
    collection.distinct('source', query, (err, result) => {
      if (err) throw err;
      res.status(200).json(result);
    });
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
