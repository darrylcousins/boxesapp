/**
 * @module mail/subscripton-action
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import buildMail from "./build-mail.js";

/*
 * @function mail/charge-upcoming.js
 * @param (object) data
 */
export default async ({ type, descriptiveType, attributes, includes }) => {
  const email = attributes.customer.email;
  const title = `Subscription ${type.charAt(0).toUpperCase()}${type.substring(1).toLowerCase()}`;
  const subject = `${title} ${attributes.title} - ${attributes.variant}`;
  const templateFile = "subscription-action";

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
    title,
    subject,
    templateFile,
    attributes,
    includes,
    type,
    descriptiveType: descriptiveType ? descriptiveType : type,
    meta,
  };

  return await buildMail(opts);
};

