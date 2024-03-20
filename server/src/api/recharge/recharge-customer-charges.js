/*
 * @module api/recharge/recharge-customer-charges.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { gatherVerifiedData } from "../../lib/recharge/verify-customer-subscriptions.js";
import { getIOSocket } from "./lib.js";

/*
 * @function recharge/recharge-customer-charges.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  let io;
  let session_id;
  let socket;
  const quiet = true;
  if (Object.hasOwn(req.query, "session_id")) {
    req.body.session_id = req.query.session_id;

    socket = getIOSocket(req, quiet);
    io = socket.io;
    session_id = socket.session_id;
  };

  const { customer_id, address_id, scheduled_at, subscription_id } = req.params;

  const query = [
    ["customer_id", customer_id ],
    ["status", "queued" ],
    ["sort_by", "scheduled_at-asc" ],
  ];
  if (address_id) {
    query.push(["address_id", req.params.address_id]); // match address id
    query.push(["scheduled_at", req.params.scheduled_at]); // match scheduled
  };

  let charges;
  try {
    const queryResult = await makeRechargeQuery({
      path: `charges`,
      query,
      title: "Charges",
      io,
    });
    charges = queryResult.charges;
  } catch(err) { // may be a 404;
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };

  try {
    if (!charges || !charges.length) {
      // so we'll check here against local db (updated nightly), perhaps a failed re-charge
      // return a result of none
      return res.status(200).json({ message: "No upcoming charges found" });
    };

    const customer = await _mongodb.collection("customers").findOne({
      recharge_id: parseInt(customer_id)
    });
    if (customer) {
      if (customer.subscriptions_active_count > 0 && customer.charge_list.length === 0) {
        return res.status(200).json({ message: "Charge error, this may mean that Recharge was unable to process a charge and your subscriptions have been paused." });
      };
    };

    const { data, errors } = await gatherVerifiedData({ charges, customer, io });

    if (io) io.emit("progress", "Returning charge data ...");

    if (subscription_id) {
      const subscription = data.find(el => el.attributes.subscription_id === parseInt(subscription_id));
      return res.status(200).json({ subscription, errors });
    } else {
      return res.status(200).json({ result: data, errors });
    };

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

