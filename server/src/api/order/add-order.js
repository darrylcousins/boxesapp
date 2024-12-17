/*
 * @module api/order/add-order.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectId } from "mongodb";
import { mongoInsert } from "../../lib/mongo/mongo.js";
import { getNZDeliveryDay } from "../../lib/dates.js";

/*
 * @function order/add-order.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const data = {...req.body};
  data.name = `${data.first_name} ${data.last_name}`;
  data.shopify_order_id = null;
  data.shopify_customer_id = null;
  data.inserted = new Date().toDateString();
  data.created = new Date();
  data.shipping = {
    carrier_identifier: null,
    code: "Standard",
    source: "Admin",
    title: null,
  };
  data.source = {
    name: "Admin",
    type: "Manual",
  };
  data.created = new Date();
  data._id = new ObjectId();
  const meta = {
    order: {
      box: data.variant_name,
      email: data.contact_email,
      delivered: data.delivered,
      inserted: data.inserted,
    }
  };
  _logger.notice(`Order created through admin api.`, { meta });

  try {
    const result = await _mongodb.collection("orders").insertOne(data);
    res.status(200).json(result);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
