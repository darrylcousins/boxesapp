/*
 * @module api/recharge/customers.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */

/*
 * @function log/customer-logs.js
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 *
 * Storing customers locally.
 * The reason is because the customer api on recharge does not provide sorting
 * (except id and created/updated date) nor searching except by email and ecommerce id
 * Admin ui expects next_cursor and previous_cursor for 'pagination'
 */
import { sortObjectArrayByKey } from "../../lib/helpers.js";

export default async (req, res, next) => {

  const query = {};

  const collection = _mongodb.collection("customers");
  try {
    const customers = await collection.find({}).sort({ last_name: 1 }).toArray();

    res.status(200).json({ customers });
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


