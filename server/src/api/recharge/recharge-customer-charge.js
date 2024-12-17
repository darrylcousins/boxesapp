/*
 * @module api/recharge/recharge-customer-charge.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { gatherVerifiedData } from "../../lib/recharge/verify-customer-subscriptions.js";
import { getIOSocket } from "./lib.js";

/*
 * @function recharge/recharge-customer-charge.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * This used primarily to reload the charge after editing i.e. in
 * components/subscription.js and cancelled.js where the subscription_id is
 * provided. It is also used in recharge admin to load a single charge cf all
 * customer charges (components/customers.js)
 *
 * To run verifyCustomerSubscriptions we need a customer object as stored in local db
 */
export default async (req, res, next) => {

  const { customer_id, scheduled_at, address_id } = req.params;

  let io;
  let session_id;
  let socket;
  if (Object.hasOwn(req.query, "session_id")) {
    req.body.session_id = req.query.session_id;

    socket = getIOSocket(req);
    io = socket.io;
    session_id = socket.session_id;
  };

  try {
    const { customer } = await makeRechargeQuery({
      path: `customers/${customer_id}`,
      title: `Get customer (${customer_id})`,
      io,
    });
    const { address } = await makeRechargeQuery({
      path: `addresses/${address_id}`,
      title: `Get address (${address_id})`,
      io,
    });
    const { subscriptions } = await makeRechargeQuery({
      path: `subscriptions`,
      title: `Get subscriptions for ${scheduled_at}`,
      query: [
        ["customer_id", customer_id],
        ["status", "active"],
        ["limit", 100],
        ["address_id", address_id],
      ],
      io,
      session_id,
    });
    for (const subscription of subscriptions) {
      console.log(subscription.next_charge_scheduled_at, scheduled_at);
      subscription.purchase_item_id = subscription.id;
      subscription.title = subscription.product_title;
    };
    const charge = {
      shipping_address: address,
      customer: customer,
      address_id,
      scheduled_at,
      line_items: subscriptions.filter(el => el.next_charge_scheduled_at === scheduled_at),
    };

    const { data, errors } = await gatherVerifiedData({ charges: [ charge ], customer, io });

    // emitting finish to stop loading routine
    if (io) io.emit("finished", { session_id });

    return res.status(200).json({ charge, subscriptions: data, errors, customer });

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


