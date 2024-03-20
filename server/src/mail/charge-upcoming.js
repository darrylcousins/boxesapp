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
  const title = "Charge Upcoming";
  let subject;
  if (subscriptions.length === 1) {
    subject = `${title} ${attributes.title} - ${attributes.variant}`;
  } else {
    subject = `${title} Delivery ${attributes.variant}`;
  };
  const templateFile = "charge-upcoming";

  // logging meta data - becomes meta.recharge for notices
  const meta = {
    customer_id: attributes.customer.id,
    charge_id: attributes.charge_id,
    [`title${subscriptions.length > 0 ? "s" : ""}`]: subscriptions.map(el => el.attributes.title),
    [`subscription_id${subscriptions.length > 0 ? "s" : ""}`]: subscriptions.map(el => el.attributes.subscription_id),
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
    type: "upcoming",
    meta,
  };

  return await buildMail(opts);
};
