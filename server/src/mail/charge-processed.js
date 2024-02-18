/*
 * @module mail/charge-upcoming.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import buildMail from "./build-mail.js";

/*
 * @function mail/charge-upcoming.js
 * @param (object) data
 */
export default async ({ subscriptions, attributes }) => {
  const email = attributes.customer.email;
  const title = "Subscription Order Processed";
  const subject = `${title} ${attributes.order_name}`;
  const templateFile = "charge-processed";

  // logging meta data - becomes meta.recharge for notices
  const meta = {
    customer_id: attributes.customer.id,
    charge_id: attributes.charge_id,
    subscription_id: subscriptions.map(el => attributes.subscription_id),
    subject,
    email,
  };

  // need to add the box details to this email
  const opts = {
    to: email,
    title,
    subject,
    templateFile,
    subscriptions,
    attributes,
    type: "processed",
    meta,
  };

  return await buildMail(opts);
};

