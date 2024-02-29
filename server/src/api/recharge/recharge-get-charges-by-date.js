/*
 * @module api/recharge/get-charges-by-date
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";
import { delay } from "../../lib/helpers.js";

const isValidDateString = (str) => {
  const d = new Date(Date.parse(str));
  return d instanceof Date && !isNaN(d);
};
const getQuery = (result, date) => {
  console.log(date);
  let query = [
    ["limit", 250 ],
    ["scheduled_at", date ],
  ];
  if (result.next_cursor) {
    query.push(
      ["page_info", result.next_cursor ],
    );
  };
  return query;
};
/*
 * @function recharge/get-charges-by-date
 * @param (Http request object) req
 * @param (Http response object) res
 * @param (function) next
 */
export default async (req, res, next) => {
  const date = req.query.date;
  if (!isValidDateString(date)) {
    return res.status(200).json({ error: "Invalid Date" });
  };

  try {

    let nextCursor = true;
    let charges = [];
    let result = { next_cursor: false };

    let count = 1;
    while (nextCursor === true && count < 3) {
      result = await makeRechargeQuery({
        path: `charges`,
        query: getQuery(result, date),
      });
      console.log(result.charges.length);
      charges = [ ...charges, ...result.charges ];
      if (!result.next_cursor) nextCursor = false;
      count++;
    };

    const final = [];
    let item, customer;
    for (const charge of charges) {
      // analyze line items and group by box subscription
      // check db.customers and get customer and add if missing
      // how to minimize hitting the database?
      // then group by customers and find the box subscription from line_items
      // crikey, bit of an effort then!
      item = {};
      item.customer = {
        first_name: charge.billing_address.first_name,
        last_name: charge.billing_address.last_name,
        email: charge.customer.email,
        recharge_id: parseInt(charge.customer.id),
        shopify_id: parseInt(charge.customer.external_customer_id.ecommerce),
      };
      if (!await _mongodb.collection("customers").findOne({recharge_id: parseInt(charge.customer.id)})) {
        await _mongodb.collection("customers").updateOne(
          { recharge_id: parseInt(charge.customer.id) },
          { 
            "$set" : item.customer,
            "$addToSet" : { charge_list: [ parseInt(charge.id), charge.scheduled_at ] },
          },
          { "upsert": true }
        );
      };
      item.charge_id = charge.id;
      item.scheduled_at = charge.scheduled_at;
      item.boxes = charge.line_items.filter(el => el.properties.find(e => e.name === "Including"));
      final.push(item);
    };
    return res.status(200).json(final);
  } catch(err) {
    res.status(200).json({ error: err.message });
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};



