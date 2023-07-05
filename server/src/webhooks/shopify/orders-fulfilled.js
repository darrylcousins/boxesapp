/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
/*
 * XXX I've disabled this webhook but left it in place in case I change my mind.
 * What I was finding was that it caused an excessive load on the server when a
 * hundred or so orders were bulk fulfilled as is the usual case.
 * XXX cronjobs/dbclean run weekly clears older orders from the database as
 * well as saving them to json file
 */
import { sortObjectByKeys } from "../../lib/helpers.js";

export default async function ordersFulfilled(topic, shop, body) {

  const mytopic = "ORDERS_FULFILLED";
  if (topic !== mytopic) {
    _logger.notice(`Shopify webhook ${topic} received but expected ${mytopic}`, { meta: { shopify: {} } });
    return;
  };

  const orderJson = JSON.parse(body);
  //_logger.info(JSON.stringify(body, null, 2));
  const { id, order_number } = orderJson;
  //_logger.info(id, order_number);
  const collection = _mongodb.collection("orders");
  try {
    const result = await collection.deleteOne({shopify_order_id: parseInt(id), order_number: order_number.toString()});
    const meta = {
      order: {
        shopify_order_id: id,
        order_number,
        deleted: result.deletedCount,
      }
    };
    meta.order = sortObjectByKeys(meta.order);
    _logger.notice(`Shopify webhook ${topic.toLowerCase().replace(/_/g, "/")} received.`, { meta });
  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
  return true;
};
