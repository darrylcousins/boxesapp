/*
 * @module api/box/current-boxes-for-box-product.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { getFilterSettings } from "../../lib/settings.js";
import { getOrderCount } from "../../lib/orders.js";
/*
 * @function box/current-boxes-for-box-product.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const response = Object();
  const now = new Date();
  now.setDate(now.getDate() + 2); // account for cutoff times of around 3 days
  const box_product_id = parseInt(req.params.box_product_id, 10);

  //const filters = await getFilterSettings();
  //const counts = await getOrderCount();
  try {
    const pipeline = [
      { "$match": {
        active: true,
        shopify_title: { "$ne": null },
        "$or": [
          { includedProducts: { "$elemMatch": { shopify_product_id: box_product_id } } },
          { addOnProducts: { "$elemMatch": { shopify_product_id: box_product_id } } }
        ],
      }},
      { "$project": {
        shopify_title: "$shopify_title",
        delivered: "$delivered",
        shopify_handle: "$shopify_handle",
        shopify_product_id: "$shopify_product_id",
        active: "$active",
        includedProduct: { "$in": [box_product_id, { "$map": { input: "$includedProducts", in: "$$this.shopify_product_id" }}]},
        addOnProduct: { "$in": [box_product_id, { "$map": { input: "$addOnProducts", in: "$$this.shopify_product_id" }}]},
        includedProducts: "$includedProducts",
        addOnProducts: "$addOnProducts",
        iso: { "$dateFromString": {dateString: "$delivered", timezone: "Pacific/Auckland"}},
      }},
      { "$match": { iso: { "$gte": now } } },
      { "$sort" : { iso: 1 } },
      {
        "$group": {
          _id: "$shopify_handle",
          boxes: { $push: "$$ROOT" }
        },
      },
    ];
    let result = await _mongodb.collection("boxes").aggregate(pipeline).toArray();
    for (const box of result) {
      response[box._id] = box.boxes;
    };
    for (const [key, value] of Object.entries(response)) console.log(key, value);

    res.status(200).json(response);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
