/*
 * @module api/box/current-boxes-for-box-product.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { getDeliveryDays } from "../../lib/boxes.js";
/*
 * @function box/current-boxes-for-box-product.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * NOTE the client does not send weekday
 * NOTE this is used to collect boxes from the client Box Produce
 */
export default async (req, res, next) => {
  const response = Object();
  const box_product_id = parseInt(req.params.box_product_id, 10);

  // the dates are filtered using filter settings including order limits and cutoff hours
  // NOTE the client app does not send weekday, i.e. is undefined so filters are used
  const db = {
   orders: _mongodb.collection("orders"),
   boxes: _mongodb.collection("boxes"),
   settings: _mongodb.collection("settings"),
  };

  // collect filtered date arrays for each box
  // used later to filter the pipeline results - see comment below about
  // attempt to get this into the pipeline
  const filteredDates = {};
  const box_ids = await db.boxes.distinct("shopify_product_id");
  for (const id of box_ids) {
    filteredDates[id] = await getDeliveryDays(db, id);
  };

  // this is just to to a basic filter to reduce the loop later
  const now = new Date();
  now.setDate(now.getDate()); // account for cutoff times of around 2 days

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
    /* Forced to give up trying to use this in the pipeline, dates was always undefined
     * so was unable to match using $in - never an array
     * tried many iterations of the following
      { "$addFields": {
        dates: filteredDates["$shopify_product_id"],
      }},
      { "$match": { delivered: { "$in": filteredDates["$shopify_product_id"] } } },
      */
    let result = await _mongodb.collection("boxes").aggregate(pipeline).toArray();

    // so gave up and now loop over the results and check if in acceptable dates array
    result.forEach((box, idx) => {
      for (const [i, el] of Object.entries(box.boxes).reverse()) { // always use reverse
        if (!filteredDates[el.shopify_product_id].includes(el.delivered)) {
          box.boxes.splice(i, 1); // remove it
        };
      };
      response[box._id] = box.boxes;
    });

    //for (const [key, value] of Object.entries(response)) console.log(key, value);

    res.status(200).json(response);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
