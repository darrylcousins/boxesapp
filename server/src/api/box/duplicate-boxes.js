/*
 * @module api/box/duplicate-boxes.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectId } from "mongodb"; // only after mongodb@ -> mongodb@6
import { getNZDeliveryDay } from "../../lib/dates.js";
import { getDefaultBoxSettings } from "../../lib/boxes.js";

/*
 * @function box/duplicate-boxes.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  // collect the boxes by date
  const collection = _mongodb.collection("boxes");
  // date from which we're duplicating
  const deliveryDay = getNZDeliveryDay(new Date(req.body.currentDate).getTime());
  // duplicating to
  const delivered = getNZDeliveryDay(new Date(req.body.delivered).getTime());
  try {
    const target = await collection.find({ delivered, shopify_title: { "$in": req.body.boxes } }).toArray();
    if (target.length > 0) {
      const found_titles = target.map(el => el.shopify_title).join(" ");
      return res.status(200).json({ error: `Found ${found_titles} already scheduled for ${delivered}` });
    };

    const result = await collection.find({ delivered: deliveryDay }).toArray();
    const boxes = result.filter(el => req.body.boxes.includes(el.shopify_title));
    boxes.forEach(async (boxDoc) => {
      const box = await collection.findOne({ delivered, shopify_product_id: boxDoc.shopify_product_id });
      if (!box) {
        delete boxDoc.frozen;
        boxDoc.delivered = delivered;
        boxDoc._id = new ObjectId();
        boxDoc.addOnProducts = boxDoc.addOnProducts.map(prod => {
          prod._id = new ObjectId();
          return prod;
        });
        boxDoc.includedProducts = boxDoc.includedProducts.map(prod => {
          prod._id = new ObjectId();
          return prod;
        });
        boxDoc.active = false; // default to inactive
        await collection.insertOne(boxDoc);
      };
    });

    // also need to set up default settings for the day
    await getDefaultBoxSettings(delivered); // will create them if not present

    res.status(200).json({ delivered });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
