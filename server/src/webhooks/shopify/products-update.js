/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { sortObjectByKeys } from "../../lib/helpers.js";

export default async function productsUpdate(topic, shop, body) {

  const mytopic = "PRODUCTS_UPDATE";
  if (topic !== mytopic) {
    _logger.notice(`Shopify webhook ${topic} received but expected ${mytopic}`, { meta: { shopify: {} } });
    return;
  };

  const productJson = JSON.parse(body);
  const shopify_title = productJson.title.replace(/,/g, ""); // cannot allow commas in titles
  const shopify_product_id = parseInt(productJson.id);
  const collection = _mongodb.collection("boxes");
  // XXX handle as well??
  // need similar for "Container Box" -  fix title only
  if (productJson.product_type === 'Container Box') {
    const boxQuery = {
      shopify_product_id,
      shopify_title: { "$ne": shopify_title }
    };
    const boxUpdate = { $set: {
      shopify_title,
    }};
    try {
      const boxResult = await collection.updateMany(boxQuery, boxUpdate);
      if (Boolean(boxResult.modifiedCount)) { // only log if an update performed
        const boxMeta = {
          product: {
            shopify_title,
            shopify_product_id,
            modified: boxResult.modifiedCount,
          }
        };
        boxMeta.product = sortObjectByKeys(boxMeta.product);
        _logger.notice(`Shopify webhook ${topic.toLowerCase().replace(/_/g, "/")} received.`, { meta: boxMeta });
      } else {
        return;
      };
    } catch(err) {
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      return;
    };
  } else if (productJson.product_type === 'Box Produce') {
    const shopify_price = parseInt(parseFloat(productJson.variants[0].price) * 100);
    let possible_tags;
    // get possible tags from settings
    try {
      const avail_tags = await _mongodb.collection("settings").findOne({handle: "product-tags"});
      if (avail_tags) {
        possible_tags = avail_tags.value.split(',');
      };
    } catch (err) {
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      return;
    };
    const tags = productJson.tags ? productJson.tags.split(',').map(el => el.trim()).filter(el => possible_tags.includes(el)) : [];
    let tag = "";
    if (tags.length) {
      tag = tags[0];
    };
    
    try {
      const dates = await collection.distinct('delivered');
      const searchDates = [];
      for (const d of dates) {
        searchDates.push(d);
      };
      let resultCount = 0;
      for (const products of ['includedProducts', 'addOnProducts']) {
        // Arrays are naturally coersible to string, therefore can be used as completely legal keys 
        // This query was working but not filtering for no changes to title nor price
        //const query = {delivered: { $in: searchDates }, [`${products}`]: { $elemMatch: { shopify_product_id}}};
        const query = {
          delivered: { $in: searchDates },
          [`${products}`]:
            { $elemMatch: {
              $and: [
                { shopify_product_id },
                { $or: [
                  { shopify_price: { $ne: shopify_price} },
                  { shopify_title: { $ne: shopify_title} },
                  { shopify_tag: { $ne: tag} },
                ]},
              ]},
            },
        };
        const update = { $set: {
          [`${products}.$[product].shopify_price`]: shopify_price,
          [`${products}.$[product].shopify_title`]: shopify_title,
          [`${products}.$[product].shopify_tag`]: tag
        }};
        const options = { arrayFilters: [
          // This filter was working but not filtering for no changes to title nor price
          //{ "product.shopify_product_id": shopify_product_id }
          { $and: [
            { "product.shopify_product_id": shopify_product_id },
            { $or: [
              { "product.shopify_price": { $ne: shopify_price} },
              { "product.shopify_title": { $ne: shopify_title} },
              { "product.shopify_tag": { $ne: tag} },
            ]},
          ]},
        ]};
        const result = await collection.updateMany(query, update, options);
        resultCount += result.modifiedCount;
        //_logger.info(JSON.stringify(result, null, 2));
      };
      if (resultCount) { // only log if an update performed
        const meta = {
          product: {
            shopify_title,
            shopify_product_id,
            shopify_price,
            modified: resultCount,
          }
        };
        meta.product = sortObjectByKeys(meta.product);
        _logger.notice(`Shopify webhook ${topic.toLowerCase().replace(/_/g, "/")} received.`, { meta });
      } else {
        return;
      };
    } catch(err) {
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    };
  };
  return true;
};
