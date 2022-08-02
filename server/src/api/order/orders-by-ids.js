/*
 * @module api/order/orders-by-ids.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectID } from "mongodb";

/*
 * @function order/orders-by-ids.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  let ids = [];
  const collection = _mongodb.collection("orders");
  try {
    if (Object.keys(req.query).length) {
      if (Object.hasOwnProperty.call(req.query, 'ids')) {
        ids = req.query.ids.split(",").map(el => ObjectID(el));
      };
    };
    collection.find({_id: {$in: ids}}).toArray((err, result) => {
      if (err) throw err;
      res.status(200).json(result);
    })
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
