/**
 * @module mail/subscripton-action
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import buildMail from "./build-mail.js";
import { makeRechargeQuery } from "../lib/recharge/helpers.js";

/*
 * @function mail/subscription-action.js
 * @param (object) data
 */
export default async ({ type, descriptiveType, attributes, properties, address, includes, now, navigator, admin, counter, change_messages }) => {
  const email = attributes.customer.email;
  const title = `Subscription ${type.charAt(0).toUpperCase()}${type.substring(1).toLowerCase()}`;
  const subject = `${title} ${attributes.title} - ${attributes.variant}`;
  const templateFile = "subscription-action";

  // should I do this elsewhere?
  let customerAddress;
  if (!address) {
    const result = await makeRechargeQuery({
      path: `addresses/${attributes.address_id}`,
      title: "Recharge Address"
    });
    customerAddress = result.address;
  } else {
    customerAddress = address;
  };

  // logging meta data - becomes meta.recharge for notices
  const meta = {
    customer_id: attributes.customer.id,
    charge_id: attributes.charge_id,
    subscription_id: attributes.subscription_id,
    subject,
    email,
    type,
  };

  for (const item of includes) {
    item.total_price = parseFloat(item.price * item.quantity).toFixed(2);
  };
  if (counter) {
    let [minutes, seconds] = counter.split(":");
    minutes = parseInt(minutes);
    seconds = parseInt(seconds);
    if (minutes === 0) {
      if (seconds === 60) {
        minutes = 1;
        seconds = 0;
      };
    };
    minutes = minutes === 0 ? "" : `${ `${minutes}`.padStart(2, "0") }:`;
    counter = minutes !== "" ? `${minutes}${ `${seconds}`.padStart(2, "0") } minutes` : `${seconds} seconds`;
  };
  console.log(counter);

  const opts = {
    to: email,
    address: customerAddress,
    title,
    subject,
    templateFile,
    attributes,
    includes,
    properties,
    type,
    descriptiveType: descriptiveType ? descriptiveType : type,
    meta,
    now,
    navigator,
    admin,
    counter,
    change_messages,
  };

  return await buildMail(opts);
};

