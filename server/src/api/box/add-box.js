/*
 * @module api/box/add-box.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectId } from "mongodb";
import { makeShopQuery } from "../../lib/shopify/helpers.js";
import { getNZDeliveryDay } from "../../lib/dates.js";
import { getDefaultBoxSettings } from "../../lib/boxes.js";

/*
 * @function box/add-box.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */

// Feb 2024 - this is old! no try/catch/error
export default async (req, res, next) => {

  try {
    const {delivered, shopify_product_id} = req.body;
    const deliveryDay = getNZDeliveryDay(new Date(delivered).getTime());

    // before adding check that the box is not already created for this delivery date
    const collection = _mongodb.collection("boxes");
    const result = await collection.findOne({ delivered: deliveryDay, shopify_product_id })
    if (result) {
      res.status(200).json({error: `${deliveryDay} already has ${result.shopify_title}`});
      return;
    };

    // first collect the product details from shopify
    const path = "products.json";
    const fields = ["id", "title", "handle"];
    const limit = 3;
    const query = [
      ["ids", shopify_product_id.toString()]
    ];

    const makeDoc = (product) => {
      return {
        _id: new ObjectId(),
        delivered: deliveryDay,
        shopify_title: product.title,
        shopify_handle: product.handle,
        shopify_product_id: product.id,
        // no longer storing these values as variants can vary!
        //shopify_variant_id: product.variants[0].id,
        //shopify_price: parseFloat(product.variants[0].price) * 100,
        addOnProducts: [],
        includedProducts: [],
        active: false,
      }
    };

    const productDoc = await makeShopQuery({path, limit, query, fields, title: "Product search"})
      .then(async ({products}) => {
        if (products.length === 0) {
          _logger.info('no product found on shop');
          return null;
        } else if (products.length > 1) {
          _logger.info('more than one product found on shop');
          return null;
        } else {
          return makeDoc(products[0]);
        }
      });

    const insertResult = await collection.insertOne(productDoc);
    _logger.info(
      `${insertResult.insertedCount} documents were inserted with the _id: ${insertResult.insertedId}`,
    );

   // also need to set up default settings for the day
   await getDefaultBoxSettings(productDoc.delivered); // will create them if not present

    res.status(200).json(productDoc);
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
