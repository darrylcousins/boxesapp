/*
 * @module api/setting/edit-box-rule.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { mongoUpdate } from "../../lib/mongo/mongo.js";
import { ObjectId } from "mongodb";

/*
 * @function setting/edit-box-rule.js
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

  doc._id = new ObjectId(doc._id);
  _logger.info(doc);
  try {
    const result = await mongoUpdate(_mongodb.collection("settings"), doc);
    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


