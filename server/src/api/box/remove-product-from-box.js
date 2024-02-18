/*
 * @module api/box/remove-product-from-box.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectId } from "mongodb"; // only after mongodb@ -> mongodb@6

/*
 * @function box/remove-product-from-box.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const {box_id, shopify_product_id, product_type} = req.body;

  const pullCmd = {}; // construct here to use product_type string
  pullCmd[product_type] = {shopify_product_id};

  const collection = _mongodb.collection("boxes");
  try {
    const result = await collection.updateOne(
      { _id: new ObjectId(box_id) },
      { $pull: pullCmd }
    );
    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
