/*
 * @module api/order/remove-order.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectId } from "mongodb";
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
  console.log(data);

  try {
    const query = {_id: new ObjectId(data._id)};
    console.log(query);
    const result = await _mongodb.collection("orders").deleteOne(query);
    _logger.info(JSON.stringify(result, null, 2));

    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
