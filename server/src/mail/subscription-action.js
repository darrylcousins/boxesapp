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
export default async ({ type, descriptiveType, attributes, properties, includes, now, navigator, admin, counter, change_messages }) => {
  const email = attributes.customer.email;
  const title = `Subscription ${type.charAt(0).toUpperCase()}${type.substring(1).toLowerCase()}`;
  const subject = `${title} ${attributes.title} - ${attributes.variant}`;
  const templateFile = "subscription-action";

  // should I do this elsewhere?
  const { address } = await makeRechargeQuery({
    path: `addresses/${attributes.address_id}`,
    title: "Recharge Address"
  });

  // logging meta data - becomes meta.recharge for notices
  const meta = {
    customer_id: attributes.customer.id,
    charge_id: attributes.charge_id,
    subscription_id: attributes.subscription_id,
    subject,
    email,
    type,
  };

  const opts = {
    to: email,
    address,
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

  console.log("type:", type);
  console.log("admin?:", admin);

  return await buildMail(opts);
};

