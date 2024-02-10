/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectID } from "mongodb";
import { getBoxesForCharge, getMetaForCharge, writeFileForCharge, buildMetaForBox, itemStringToList  } from "./helpers.js";

/* https://developer.rechargepayments.com/2021-11/webhooks_explained
 * 
 * The first time a charge is created (i.e. order through shopify) the
 * subscriptions do not have box_subscription_id set, the delivery date needs
 * to be updated. As does also the next charge date to sync with 3 days before
 * delivery
 *
 */
export default async function chargeDeleted(topic, shop, body, { io, sockets }) {

  const mytopic = "CHARGE_DELETED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const charge = JSON.parse(body);
  console.log(charge);

  try {

    const my_query = {
      charge_id: charge.id,
      action: "cancelled",
    };

    const entry = await _mongodb.collection("updates_pending").findOne(my_query);
    if (entry) {

      if (sockets && io && Object.hasOwnProperty.call(sockets, entry.session_id)) {
        const socket_id = sockets[entry.session_id];
        io = io.to(socket_id);
        io.emit("completed", `Charge cancelled ${charge.id}`);
        io.emit("finished", {
          action: "cancelled",
          session_id: entry.session_id,
          subscription_id: entry.subscription_id,
          address_id: entry.address_id,
          customer_id: entry.customer_id,
          scheduled_at: entry.scheduled_at,
          charge_id: charge.id,
        });
      };

      // we can remove this entry
      console.log("=======================");
      console.log("Deleting updates pending enty");
      console.log("=======================");
      await _mongodb.collection("updates_pending").deleteOne({ _id: ObjectID(entry._id) });
    };


  } catch(err) {

    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

};



