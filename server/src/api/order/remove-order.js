/*
 * @module api/order/remove-order.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectID } from "mongodb";
import { mongoRemove } from "../../lib/mongo/mongo.js";

/*
 * @function order/remove-order.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  _logger.info(`${_filename(import.meta)} Removing order: ${JSON.stringify(req.body, null, 2)}`);

  const data = { ...req.body };
  const collection = _mongodb.collection("orders");

  try {
    const query = {_id: ObjectID(data._id)};
    const result = await mongoRemove(collection, query);
    _logger.info(JSON.stringify(result, null, 2));

    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
