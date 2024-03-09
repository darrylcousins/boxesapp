/*
 * @module api/recharge/remove-pending-entries
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectId } from "mongodb";

/*
 * @function recharge/remove-pending-entries
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const entries = req.body.selectedOrders.map(el => new ObjectId(el));

  try {
    const query = { "_id": {"$in": entries }};
    const update = { "$unset": { error: "" }};

    const result = await _mongodb.collection("orders").updateMany(query, update);

    const response = {modifiedCount: 0};
    if (Object.hasOwn(result, "modifiedCount")) {
      response.modifiedCount = result.modifiedCount;
    };

    // collect orders with an error
    response.erroredOrders = await _mongodb.collection("orders").find(
      { error: { "$exists": true} },
    ).sort({ created: -1 }).toArray();

    return res.status(200).json(response);
    return res.status(200).json({ error: "Nothing changed" });
  
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};



