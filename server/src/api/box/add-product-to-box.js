/*
 * @module api/box/add-product-to-box.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeShopQuery } from "../../lib/shopify/helpers.js";
import { ObjectID } from "mongodb";

/*
 * @function box/add-product-to-box.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const {box_id, shopify_product_id, product_type} = req.body;
  _logger.info(`adding product with id ${shopify_product_id} to type: ${product_type}`);

  if (!product_type) {
    res.status(400).json({ error: "No product type" });
    return;
  };

  // first collect the product details from shopify
  const path = "products.json";
  const fields = ["id", "title", "handle", "variants", "tags"];
  const limit = 3;
  const query = [
    ["ids", shopify_product_id.toString()]
  ];

  // get settings tags
  const tagQuery = await _mongodb.collection("settings").find({handle: "product-tags"}).toArray();
  const tags = tagQuery[0].value;

  const makeDoc = (product) => {
    const tag = product.tags.split(',').map(el => el.trim()).find(el => tags.includes(el));
    return {
      _id: new ObjectID(),
      shopify_title: product.title,
      shopify_handle: product.handle,
      shopify_product_id: product.id,
      shopify_variant_id: product.variants[0].id,
      shopify_price: parseFloat(product.variants[0].price) * 100,
      shopify_tag: tag
    }
  };

  const productDoc = await makeShopQuery({path, limit, query, fields})
    .then(async ({products}) => {
      if (products.length === 0) {
        _logger.info('no product found on shop');
        return null;
      } else if (products.length > 1) {
        _logger.info('more than one product found on shop');
        return null;
      } else {
        return makeDoc(products[0]);
        // insert product to the array
      }
    });

  if (productDoc) {

    const collection = _mongodb.collection("boxes");
    const result = await collection.updateOne(
      { _id: ObjectID(box_id) },
      { $push: { 
        [product_type] : {
          "$each": [ productDoc ],
          "$sort": { "shopify_title": 1 },
      }}}
    );

    res.status(200).json(result);
  } else {
    res.status(400).json({error: "Unable to add product"});
  }
};
