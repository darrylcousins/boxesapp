/*
 * @module api/box/duplicate-boxes.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectID } from "mongodb";
import { getNZDeliveryDay } from "../../lib/dates.js";

/*
 * @function box/duplicate-boxes.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  // collect the boxes by date
  const collection = _mongodb.collection("boxes");
  const deliveryDay = getNZDeliveryDay(new Date(req.body.currentDate).getTime());
  const delivered = getNZDeliveryDay(new Date(req.body.delivered).getTime());
  try {
    collection.find({ delivered: deliveryDay })
      .toArray((err, result) => {
        if (err) throw err;
        const boxes = result.filter(el => req.body.boxes.includes(el.shopify_title));
        const foundBoxes = []; // collect found boxes and report back to form!
        boxes.forEach(boxDoc => {
          collection.findOne({ delivered, shopify_product_id: boxDoc.shopify_product_id }, async (e, box) => {
            if (e) _logger.info(`${_filename(import.meta)} Got error ${e}`);
            if (!box) {
              boxDoc.delivered = delivered;
              boxDoc._id = new ObjectID();
              boxDoc.addOnProducts = boxDoc.addOnProducts.map(prod => {
                prod._id = new ObjectID();
                return prod;
              });
              boxDoc.includedProducts = boxDoc.includedProducts.map(prod => {
                prod._id = new ObjectID();
                return prod;
              });
              boxDoc.active = false; // default to inactive
              _logger.info(`${_filename(import.meta)} Inserting duplicate ${boxDoc.shopify_title} for ${boxDoc.delivered}`);
              await collection.insertOne(boxDoc);
            };
          });
        });
        res.status(200).json(req.body);
      });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
