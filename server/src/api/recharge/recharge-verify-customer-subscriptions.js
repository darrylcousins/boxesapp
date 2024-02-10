/*
 * @module api/recharge/remove-pending-entries
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

import { verifyCustomerSubscriptions } from "../../lib/recharge/verify-customer-subscriptions.js";

/*
 * @function recharge/remove-pending-entries
 *
 * Performs the verification checks as for the nightly clean subscription cronjob.
 * Called by admin after "fixing" the problems, updates the 'faulty' table and
 * returns an answer to the admin - fixed? or not?
 *
 * 
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {

  const { customer } = req.body;

  try {

    // customer object only requires recharge_id
    const { orphans, date_mismatch, price_mismatch } = await verifyCustomerSubscriptions({ customer, box_price_table: [] });
    const query = { customer_id: customer.recharge_id };

    // actually confident that I can delete all the orphans but we shan't at
    // the moment, they will be emailed to admin and self and stored on a table
    if (orphans.length || date_mismatch.length || price_mismatch.length) {
      // store data on faulty_subscription table
      // here it will be updating the timestamp only for most cases
      delete customer._id;
      delete customer.subscriptions_active_count;
      delete customer.subscriptions_total_count;

      const timestamp = new Date();
      // Let's call the table faulty_subscriptions, 
      await _mongodb.collection("faulty_subscriptions").updateOne(
        query,
        { "$set" : {
          orphans,
          date_mismatch,
          price_mismatch,
          timestamp,
        }},
        { "upsert": true }
      );

      // Return the orphans and date_mismatch arrays
      return res.status(200).json({
        orphans,
        date_mismatch,
        price_mismatch,
        timestamp,
      });

    } else {
      
      // Remove the entry from faulty subscriptions table and return successful verification
      await _mongodb.collection("faulty_subscriptions").deleteOne(query);

      return res.status(200).json({ verified: true });
    };

    // either it has passed or not
  
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};



