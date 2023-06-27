/*
 * @module api/order/bulk-edit-orders.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectID } from "mongodb";

/*
 * @function order/bulk-edit-orders.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  // only updating pickup date for now
  _logger.info(JSON.stringify(req.body, null, 2));
  const collection = _mongodb.collection("orders");
  try {
    const { _ids, ...parts } = req.body;
    const result = await collection.updateMany(
      { _id: { $in: _ids.map(id => ObjectID(id)) } },
      { $set: { ...parts } }
    );
    _logger.info(JSON.stringify(result, null, 2));
    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
