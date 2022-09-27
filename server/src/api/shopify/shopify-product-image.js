/*
 * @module api/shopify/shopify-product-image.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeShopQuery } from "../../lib/shopify/helpers.js";

/*
 * @function shopify/shopify-product-image.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const product_title = req.params.product_title;
  let product_id;
  if (!isNaN(parseInt(product_title))) {
    product_id = parseInt(product_title);
  };
  if (typeof product_id === "undefined") {
    const pipeline = [
      { "$unwind": "$includedProducts" },
      { "$unwind": "$addOnProducts" },
      { "$project": {
        included: "$includedProducts.shopify_title",
        included_price: "$includedProducts.shopify_price",
        included_product_id: "$includedProducts.shopify_product_id",
        addon: "$addOnProducts.shopify_title",
        addon_price: "$addOnProducts.shopify_price",
        addon_product_id: "$addOnProducts.shopify_product_id",
      }},
      { "$match": { "$or": [ {included: product_title}, {addon: product_title} ] }},
      { "$project": {
        title: {
          "$cond": {
            if: { "$eq": [ "$included", product_title ] },
            then: "$included",
            else: "$addon"
        }},
        price: {
          "$cond": {
            if: { "$eq": [ "$included", product_title ] },
            then: "$included_price",
            else: "$addon_price"
        }},
        product_id: {
          "$cond": {
            if: { "$eq": [ "$included", product_title ] },
            then: "$included_product_id",
            else: "$addon_product_id"
        }},
      }},
      { "$group": { "_id": "$title", "doc" : {"$first": "$$ROOT"}} },
      { "$replaceRoot": { "newRoot": "$doc"} },
    ];

    try {
      const result = await _mongodb.collection("boxes").aggregate(pipeline).toArray();
      product_id = result[0].product_id;
    } catch(err) {
      res.status(400).json({ error: err.toString() });
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      return;
    };
  };
  const path = `products/${product_id}.json`;
  const fields = ["id", "images"];
  try {
    const result = await makeShopQuery({path, fields})
      .then(async ({product}) => {
        const image = product.images.find(el => Boolean(el.src));
        return { image_src: image.src };
      });
    res.status(200).json(result);
  } catch(err) {
    const meta = err;
    meta.product_title: product_title;
    meta.product_id: product_id;
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta});
  };
};
