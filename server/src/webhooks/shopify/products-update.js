/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
export default async function productsUpdate(topic, shop, body) {

  const mytopic = "PRODUCTS_UPDATE";
  if (topic !== mytopic) {
    _logger.notice(`Shopify webhook ${topic} received but expected ${mytopic}`, { meta: { shopify: {} } });
    return;
  };

  const productJson = JSON.parse(body);
  if (productJson.product_type === 'Box Produce') {
    const shopify_product_id = parseInt(productJson.id);
    const shopify_price = parseInt(parseFloat(productJson.variants[0].price) * 100);
    const shopify_title = productJson.title;
    const collection = _mongodb.collection("boxes");
    let possible_tags;
    // get possible tags from settings
    try {
      const avail_tags = await _mongodb.collection("settings").findOne({handle: "product-tags"});
      if (avail_tags) {
        possible_tags = avail_tags.value.split(',');
      };
    } catch (err) {
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
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
          }
        };
        _logger.notice(`Shopify webhook ${topic.toLowerCase().replace(/_/g, "/")} received.`, { meta });
      };
    } catch(err) {
      _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
    };
  };
};
