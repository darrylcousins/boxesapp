/*
 * @module api/box/add-product-to-box.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import path from "path";
import fs from "fs";
import { queryStoreGraphQL } from "../../lib/shopify/helpers.js";
import sharp from "sharp";
import { ObjectId } from "mongodb";

/*
 * async job to fetch and save product images
 */
const imageProcessor = async (data) => {
  try {
    const path = `${process.env.SERVER_ROOT}/assets/product-images/${data.id}.jpg`;

    if (fs.existsSync(path)) {
      _logger.info(`Path exists ${path}`);
      return;
    };
    _logger.info(`Appear to be here with ${path}`);

    const image_data = await fetch(data.url);
    const blob = await image_data.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    sharp(buffer)
      .resize(40, 40, { fit: "cover" })
      .toFile(path);
    _logger.info(`Fetched and saved ${path}`);
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

/*
 * @function box/add-product-to-box.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const {box_id, shopify_product_id, product_type} = req.body;
  //_logger.info(`adding product with id ${shopify_product_id} to type: ${product_type}`);

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
      featuredImage {
        url
      }
    }
  }`;

  // get settings tags
  const tagQuery = await _mongodb.collection("settings").find({handle: "product-tags"}).toArray();
  const tags = tagQuery[0].value;

  const makeDoc = (product) => {
    return {
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
        // fetch the image data, convert to 40px and save as id.jpg not
        // checking for its presence because this is the only place for now
        // that it is updated - this goes to another process worker
        try {
          if (product.featuredImage && Object.hasOwnProperty.call(product.featuredImage, "url")) {
            imageProcessor({ id: shopify_product_id, url: product.featuredImage.url });
          };
        } catch(err) {
          _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
        };
        return makeDoc(product);
      }
    });

  if (typeof productDoc === "string") {
    res.status(200).json({error: productDoc});

  } else {
    const collection = _mongodb.collection("boxes");
    const result = await collection.updateOne(
      { _id: new ObjectId(box_id) },
      { $push: { 
        [product_type] : {
          "$each": [ productDoc ],
          "$sort": { "shopify_title": 1 },
      }}}
    );

    res.status(200).json(result);
  }
};
