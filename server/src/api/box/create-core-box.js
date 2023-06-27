/*
 * @module api/box/create-core-box.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectID } from "mongodb";

/*
 * @function box/create-core-box.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  _logger.info(JSON.stringify(req.body, null, 2));

  const delivered = "Core Box";
  const collection = _mongodb.collection("boxes");
  const doc = {
    _id: new ObjectID(),
    delivered,
    addOnProducts: [],
    includedProducts: []
  };
  try {
    const insertResult = await collection.insertOne(doc);
    _logger.info(
      `${insertResult.insertedCount} documents were inserted with the _id: ${insertResult.insertedId}`,
    );
    res.status(200).json(doc);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
