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

  const { selectActive, page, search } = req.query;

  const collection = _mongodb.collection("customers");

  try {
    const query = {};
    if (selectActive === "active") {
      query.subscriptions_active_count = { $ne: 0 };
    } else if (selectActive === "none-active") {
      query.subscriptions_active_count = { $eq: 0 };
    };

    if (search && search.length > 0) {
      const regex = new RegExp(search, "i");
      query["$or"] = [
        { shopify_id: { "$eq": parseInt(search) } },
        { recharge_id: { "$eq": parseInt(search) } },
        { first_name: { "$regex": regex } },
        { last_name: { "$regex":  regex } },
      ];
    };

    const count = await collection.count(query);
    const pageSize = 50;

    const currentPage = page;
    const pageCount = Math.ceil(count/pageSize);
    const skip = (currentPage - 1) * pageSize;

    const customers = await collection.find(query).sort({ last_name: 1 }).limit(pageSize).skip(skip).toArray();

    const response = {
      pageCount,
      pageNumber: currentPage,
      customerCount: count,
      customers,
    };
    res.status(200).json(response);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};


