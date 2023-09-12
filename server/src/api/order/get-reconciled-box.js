/*
 * @module api/order/get-reconciled-box.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { matchNumberedString } from "../../lib/helpers.js";
import { getNZDeliveryDay, weekdays } from "../../lib/dates.js";
import { makeShopQuery } from "../../lib/shopify/helpers.js";
import { ObjectID } from "mongodb";
import reconcileLists from "../lib.js";

/*
 * @function order/get-reconciled-box.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  // get current box by selected date and shopify product id
  const collection = _mongodb.collection("boxes");
  const response = Array();
  const deliveryDay = getNZDeliveryDay(req.params.timestamp);
  // product_id(entifier) can be shopify_title or shopify_product_id
  const product_identifier = parseInt(req.params.product_id);
  const order_id = req.params.order_id ? ObjectID(req.params.order_id) : null;
  const update = Boolean(req.query.update); // string or not at all
  const query = {
    delivered: deliveryDay
  };
  if (isNaN(product_identifier)) {
    query.shopify_title = req.params.product_id;
  } else {
    query.shopify_product_id = product_identifier;
  };
  try {
    const box = await _mongodb.collection("boxes").findOne(query);

    let order;
    let boxLists;
    if (order_id) {
      order = await _mongodb.collection("orders").findOne({ _id: order_id });
      // reconcile box with the order or return the box
      boxLists = {
        "Including": [ ...order.including ], 
        "Add on Items": [ ...order.addons ], 
        "Removed Items": [ ...order.removed ], 
        "Swapped Items": [ ...order.swaps ], 
      };
    } else {
      // creating an order: just return the box, will reconcile without changes
      boxLists = {
        //"Including": [], 
        "Including": box.includedProducts.map(el => el.shopify_title), 
        "Add on Items": [],
        "Removed Items": [],
        "Swapped Items": [],
      };
    };

    // need to get the variant for the box
    const day = new Date(parseInt(req.params.timestamp));
    const path = `products/${box.shopify_product_id}.json`;
    const fields = ["id", "variants"];
    const title = weekdays[day.getDay()];
    const { variant } = await makeShopQuery({path, fields, title: "Product detail"})
      .then(async ({product}) => {
        return {
          variant: product.variants.find(el => el.title === title),
        };
      });
    if (!variant) {
      return res.status(200).json({
        error: `Sorry. Can't do a ${box.shopify_title} on a ${title}, try another box or delivery date`
      });
    };
    box.variant_id = variant.id;
    box.variant_title = variant.title;
    box.variant_name = `${box.shopify_title} - ${variant.title}`;;

    const { properties, messages } = await reconcileLists(box, boxLists);

    // if we're not updating then return the order, else the reconciled box
    const finalProperties = (!update && order)
      ? {
        "Delivery Date": order.delivered,
        "Including": order.including.join(","), 
        "Add on Items": order.addons.join(","), 
        "Removed Items": order.removed.join(","), 
        "Swapped Items": order.swaps.join(","), 
      } : properties;

    res.status(200).json({ box, properties: finalProperties, messages, reconciled: (update || messages.length === 0) });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

