/*
 * @module api/order/edit-order.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectID } from "mongodb";
import { mongoUpdate } from "../../lib/mongo/mongo.js";
import { getNZDeliveryDay } from "../../lib/dates.js";
import { updateStoreObject } from "../../lib/shopify/helpers.js";

/*
 * @function order/edit-order.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const data = {...req.body};
  data._id = ObjectID(data._id);
  data.delivered = getNZDeliveryDay(new Date(data.delivered).getTime());
  data.pickup = getNZDeliveryDay(new Date(data.pickup).getTime());
  data.shipping = JSON.parse(data.shipping);
  data.source = JSON.parse(data.source);

  // get order to compare delivery date
  const collection = _mongodb.collection("orders");
  const order = await collection.findOne({_id: data._id}, {delivered: 1, source: 1});

  try {
    const result = await mongoUpdate(_mongodb.collection("orders"), data);
    if (order.source.name === 'Shopify' && order.delivered !== data.delivered) {
      _logger.info(`${_filename(import.meta)} Updating order tag for ${data.delivered}`);
      // 1. adds new tag and not replace tag
      updateStoreObject(order.shopify_order_id.toString(),'order', {
        id: order.shopify_order_id.toString(),
        tags: data.delivered
      });
    };
    const meta = {
      order: {
        order_number: order.order_number,
        box: order.variant_name,
        email: order.contact_email,
        delivered: data.delivered,
      }
    };
    _logger.notice(`Order edited through admin api.`, { meta });
    res.status(200).json(result);
  } catch(err) {
    res.status(400).json({ error: err.toString() });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
