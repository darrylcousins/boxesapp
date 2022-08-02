/*
 * @module api/setting/add-box-rule.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { mongoInsert } from "../../lib/mongo/mongo.js";
import { ObjectID } from "mongodb";

/*
 * @function setting/add-box-rule.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const doc = {...req.body};
  const boxes = doc.boxes;

  // get product ids
  doc.box_product_ids = await _mongodb.collection("boxes").distinct(
    "shopify_product_id",
    { shopify_title: { $in: boxes } },
    { projection: { _id: 0, shopify_product_id: 1 } });

  doc._id = new ObjectID();
  try {
    const result = await mongoInsert(_mongodb.collection("settings"), doc);
    res.status(200).json(result);
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


