/*
 * @module api/box/add-product-to-box.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import path from "path";
import { queryStoreGraphQL } from "../../lib/shopify/helpers.js";
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
    res.status(200).json({ error: "No product type" });
    return;
  };

  // prevent adding unavailable items
  if (!shopify_product_id) {
    res.status(200).json({ error: "No shopify product id" });
    return;
  };

  const body = `{
    product (id: "gid://shopify/Product/${shopify_product_id}") {
      id
      handle
      tags
      title
      sellingPlanGroupCount
      productType
      sellingPlanGroups (first: 1) {
        nodes {
          options
        }
      }
      variants (first: 2) {
        nodes {
          id
          price
          title
          displayName
        }
      }
    }
  }`;

  // get settings tags
  const tagQuery = await _mongodb.collection("settings").find({handle: "product-tags"}).toArray();
  const tags = tagQuery[0].value;

  const makeDoc = (product) => {
    return {
      _id: new ObjectID(),
      shopify_title: product.title.replace(/,/g, ""),
      shopify_handle: product.handle,
      shopify_product_id: parseInt(shopify_product_id, 10),
      shopify_variant_id: parseInt(path.basename(product.variants.nodes[0].id), 10),
      shopify_price: parseFloat(product.variants.nodes[0].price) * 100,
      shopify_tag: product.tag
    }
  };

  const productDoc = await queryStoreGraphQL({ body })
    .then(async (res) => {
      if (!Object.hasOwnProperty.call(res, "data")
        || !Object.hasOwnProperty.call(res.data, "product")) {
        _logger.info('product query failed', JSON.stringify(res));
        return "Product query failed";
      };
      const product = res.data.product;
      const tag = product.tags.map(el => el.trim()).find(el => tags.includes(el));
      if (product.sellingPlanGroupCount === 0) {
        return 'No selling plan for this product';
      } else if (product.sellingPlanGroups.nodes[0].options[0] !== "1 Week(s), 2 Week(s)") {
        return `Incorrect options on selling plan ${product.sellingPlanGroups.nodes[0].options[0]}`;
      } else if (product.productType !== "Box Produce") {
        return `Incorrect product type: ${product.productType}`;
      } else if (product.variants.nodes.length > 1) {
        return "Multiple variants found for box produce";
      } else if (product.variants.nodes[0].title !== "Default Title") {
        return "Box produce may not have options";
      } else if (!Boolean(tag)) {
        return "Unable to match a tag for the product";
      } else {
        product.tag = tag;
        return makeDoc(product);
      }
    });

  if (typeof productDoc === "string") {
    res.status(200).json({error: productDoc});

  } else {
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
  }
};
