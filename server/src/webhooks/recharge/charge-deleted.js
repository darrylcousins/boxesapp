/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { ObjectId } from "mongodb";

/* https://developer.rechargepayments.com/2021-11/webhooks_explained
 * 
 *
 */
export default async function chargeDeleted(topic, shop, body, { io, sockets }) {

  const mytopic = "CHARGE_DELETED";
  if (topic !== mytopic) {
    _logger.notice(`Recharge webhook ${topic} received but expected ${mytopic}`, { meta: { recharge: {} } });
    return;
  };
  const topicLower = topic.toLowerCase().replace(/_/g, "/");

  const { charge } = JSON.parse(body);

  try {

    const my_query = {
      charge_id: parseInt(charge.id),
    };

    const entry = await _mongodb.collection("updates_pending").findOne(my_query);
    /*
    console.log("Charge DELETED ================");
    console.log("Charge:", charge);
    console.log("updates_pending?:", entry);
    console.log("End charge DELETED ================");
    */
    if (entry && entry.action === "cancelled") {

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
      console.log("Deleting updates pending entry on cancelled");
      console.log("=======================");
      await _mongodb.collection("updates_pending").deleteOne({ _id: new ObjectId(entry._id) });
    };


  } catch(err) {

    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

};



