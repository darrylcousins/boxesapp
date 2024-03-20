/*
 * @module api/recharge/recharge-customer-charge.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { gatherVerifiedData } from "../../lib/recharge/verify-customer-subscriptions.js";

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

  let charge_id = req.params.charge_id;
  const { customer_id, subscription_id, address_id, scheduled_at } = req.query;

  try {
    let result = {};
    try {
      result = await makeRechargeQuery({
        path: `charges/${charge_id}`,
        title: `Get Charge (${charge_id})`,
      });

    } catch(err) {
      if (err.message.includes("404") && !customer_id) { // from admin
        // no need to log it
        const message = `Failed to find charge with id ${charge_id}, perhaps you need to synchronize the customer?`;
        return res.status(200).json({ error: message });
      } else {
        _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
      };
    };

    if (result.charge) {
      // need to fetch recharge customer
      //const customer = await _mongodb.collection("customers").findOne({recharge_id: parseInt(customer_id)});
      const { customer } = await makeRechargeQuery({
        path: `customers/${customer_id}`,
        title: `Get Customer (${customer_id})`,
        //io,
      });

      const { data, errors } = await gatherVerifiedData({ charges: [ result.charge ], customer });

      if (subscription_id) {
        const subscription = data.find(el => el.attributes.subscription_id === parseInt(subscription_id));
        return res.status(200).json({ subscription, errors, customer });
      } else {
        return res.status(200).json({ charge: result.charge, subscriptions: data, errors, customer });
      };
    } else {
      return res.status(200).json({ error: "Not found" });
    };

  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


