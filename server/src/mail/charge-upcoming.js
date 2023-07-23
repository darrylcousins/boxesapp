/*
 * @module mail/charge-upcoming.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import fs from "fs";
import mjml2html from "mjml";
import { Liquid } from 'liquidjs';
import sendmail from "./sendmail.js";
import "dotenv/config";

import subscriptionTemplate from "./templates/subscription.js";

/*
 * @function mail/charge-upcoming.js
 * @param (object) data
 */
export default async ({ subscriptions, admin_email }) => {
  const subscription = subscriptions[0];
  const charge_id = subscription.attributes.charge_id;
  const email = subscription.attributes.customer.email;
  const address_id = subscription.attributes.address_id;
  const subscription_id = subscription.attributes.subscription_id;
  const customer_id = subscription.attributes.customer.id;
  const admin = admin_email ? admin_email : process.env.ADMIN_EMAIL;
  const box = `${subscription.box.shopify_title} - ${subscription.attributes.variant}`;

  const engine = new Liquid();
  const options = {
    keepComments: false,
  };
  
  try {
    engine
      .parseAndRender(subscriptionTemplate, {
        subscriptions,
        env: process.env,
        admin_email: admin,
        last_delivery: "Last Delivered",
        type: "upcoming",
      })
      .then(sections => {
        const htmlOutput = mjml2html(`
    <mjml>
      <mj-body>
        <mj-section padding-bottom="0px">
          <mj-column>
            <mj-text align="center" font-size="20px" font-style="bold">
            Charge upcoming
            </mj-text>
          </mj-column>
        </mj-section>
    ${sections}
  </mj-body>
</mjml>
`, options);
        sendmail({
          //to: email,
          to: `${email}, ${process.env.SERVER_EMAIL}`,
          subject: `\[${process.env.SHOP_NAME}\] Charge upcoming`,
          html: htmlOutput.html
        });
        const meta = {
          recharge: {
            customer_id,
            charge_id,
            box,
            email,
          }
        };
        _logger.notice(`Recharge charge upcoming email sent.`, { meta });
      });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
