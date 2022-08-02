/*
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { makeRechargeQuery } from "../../lib/recharge/helpers.js";

export const getIncludedSubscriptions = async (subscription) => {
  const query = [
    ["customer_id", subscription.customer_id],
    ["address_id", subscription.address_id],
    ["scheduled_at", subscription.next_charge_scheduled_at],
  ];
  try {
    const result = await makeRechargeQuery({
      path: "charges",
      query
    });
    // XXX assumption can only be one result by customer and charge_date
    // XXX this assumption needs testing
    if (result.charges.length < 1) {
      console.log("Charge Not Found");
      return [];
    } else if (result.charges.length > 1 ) {
      console.log("Multiple Charges Found");
      return [];
    };
    const charge = result.charges[0]
    return charge.line_items;

  } catch(err) {
    console.log("ERROR", err.toString());
  };
};

