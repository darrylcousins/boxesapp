/*
 * @module api/box/duplicate-box.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectID } from "mongodb";
import { makeShopQuery } from "../../lib/shopify/helpers.js";
import { getNZDeliveryDay } from "../../lib/dates.js";

/*
 * @function box/duplicate-box.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  // boxId of the box to duplicate, shopify_product_id of the new box
  const { shopify_product_id } = req.body;
  const collection = _mongodb.collection("boxes");
  try {
    const boxId = ObjectID(req.body.boxId);
    const box = await collection.findOne({_id: boxId});
    const doc = { ...box };
    box._id = new ObjectID();

    const path = "products.json";
    const fields = ["id", "title", "handle"];
    const limit = 3;
    const query = [
      ["ids", shopify_product_id.toString()]
    ];
    const { products } = await makeShopQuery({path, limit, query, fields});
    if (products.length === 1) {
      const { id, title, handle } = products[0];
      box.shopify_product_id = id;
      box.shopify_title = title;
      box.shopify_handle = handle;
    } else {
      throw new Error("Box product no found on shopify site");
    };
    const result = await collection.insertOne(box);
    const message = `A document was inserted with the _id: ${result.insertedId}`;

    res.status(200).json({ message });
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

