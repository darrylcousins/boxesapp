/*
 * @module api/box/get-product-by-title.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function box/get-product-by-title.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  // find a box product object from any box in order to find the price
  // used in processing an update of delivery date for a recharge subscribed
  // box and we need to change the total price for an item not available in the
  // current box. Almost certain that the product will be found, most likely in
  // last weeks box
  const product_title = req.params.product_title;
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
  const collection = _mongodb.collection("boxes");
  try {
    const result = await collection.aggregate(pipeline).toArray();
    if (result.length > 0) {
      res.status(200).json(result[0]);
    } else {
      res.status(200).json({errors: "Not Found"});
    };
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
