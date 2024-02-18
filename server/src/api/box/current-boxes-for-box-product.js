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
  const box_product_id = parseInt(req.params.box_product_id, 10);

  /**
   * Get upcoming delivery dates to filter boxes by
  const distinctDeliveryDates = (colln, filters, counts) => {
    return new Promise((resolve, reject) => {
      colln.distinct('delivered', (err, data) => {
        if (err) return reject(err);
        const final = Array();
        data.forEach(el => {
          const d = new Date(Date.parse(el));
          if (d >= now) {
            const filter = filters[d.getDay()];
            const count = el in counts ? counts[el] : 0;
            // a limit of zero means no limit at all
            if (filter) {
              if (filter.hasOwnProperty("limit") && filter.limit > 0) {
                if (count >= filter.limit) return;
              };
              if (filter.hasOwnProperty("cutoff") && filter.cutoff > Math.abs(d - now) / 36e5) {
                return;
              };
            };
            final.push(d);
          };
        });
        final.sort((d1, d2) => {
          if (d1 < d2) return -1;
          if (d1 > d2) return 1;
          return 0;
        });
        resolve(final.map(el => el.toDateString()));
      });
    });
  };
  */
  const distinctDeliveryDates = async (colln, filters, counts) => {
    const data = await colln.distinct('delivered');

    const final = Array();
    data.forEach(el => {
      const d = new Date(Date.parse(el));
      if (d >= now) {
        const filter = filters[d.getDay()];
        const count = el in counts ? counts[el] : 0;
        // a limit of zero means no limit at all
        if (filter) {
          if (filter.hasOwnProperty("limit") && filter.limit > 0) {
            if (count >= filter.limit) return;
          };
          if (filter.hasOwnProperty("cutoff") && filter.cutoff > Math.abs(d - now) / 36e5) {
            return;
          };
        };
        final.push(d);
      };
    });
    final.sort((d1, d2) => {
      if (d1 < d2) return -1;
      if (d1 > d2) return 1;
      return 0;
    });
    return final.map(el => el.toDateString());
  };
  
  const filters = await getFilterSettings();
  const counts = await getOrderCount();

  const collection = _mongodb.collection("boxes");

  let dates;
  try {
    // the dates are filtered using filter settings including order limits and cutoff hours
    dates = await distinctDeliveryDates(collection, filters, counts);
  } catch(err) {
    res.status(200).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };


  // consider defining fields to avoid the inner product documents
  // https://docs.mongodb.com/drivers/node/fundamentals/crud/read-operations/project
  // TODO absolutely essential the data is unique by delivered and shopify_product_id
  // filter by dates later than now
  try {
    const result = await collection
      .find({
        delivered: {$in: dates},
        active: true,
        $or: [
          { includedProducts: { $elemMatch: { shopify_product_id: box_product_id } } },
          { addOnProducts: { $elemMatch: { shopify_product_id: box_product_id } } }
        ]
      })
      /*
      .project({
        delivered: 1, shopify_title: 1, shopify_product_id: 1, shopify_variant_id: 1
      })
      */
      .toArray();

    result.forEach(el => {
      if (!response.hasOwnProperty(el.shopify_handle)) {
        response[el.shopify_handle] = Array();
      };
      const item = { ...el };
      item.includedProduct = el.includedProducts.some(prod => prod.shopify_product_id === box_product_id);
      if (!item.includedProduct) {
        item.addOnProduct = el.addOnProducts.some(prod => prod.shopify_product_id === box_product_id) ? true : false;
      }

      response[el.shopify_handle].push(item);
    });
    res.status(200).json(response);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
