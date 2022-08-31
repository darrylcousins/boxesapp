/*
 * @module mail/subscription-created.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import fs from "fs";
import mjml2html from "mjml";
import { Liquid } from 'liquidjs';
import sendmail from "./sendmail.js";
import "dotenv/config";

import subscriptionTemplate from "./templates/subscription.js";

/*
 * @function mail/subscription-created.js
 * @param (object) data
 */
export default async ({ subscriptions, admin_email }) => {
  const email = subscriptions[0].attributes.customer.email;
  const address_id = subscriptions[0].attributes.address_id;
  const subscription_id = subscriptions[0].attributes.subscription_id;
  const customer_id = subscriptions[0].attributes.customer.id;
  const admin = admin_email ? admin_email : process.env.ADMIN_EMAIL;

  const engine = new Liquid();
  const options = {};
  
  try {
    engine
      .parseAndRender(subscriptionTemplate, {
        subscriptions,
        env: process.env,
        admin_email: admin,
        last_delivery: "Delivery Date",
        type: "created",
      })
      .then(sections => {
        const htmlOutput = mjml2html(`
    <mjml>
      <mj-body>
        <mj-section padding-bottom="0px">
          <mj-column>
            <mj-text align="center" font-size="20px" font-style="bold">
            Subscription created
            </mj-text>
          </mj-column>
        </mj-section>
    ${sections}
  </mj-body>
</mjml>
`);
        sendmail({
          to: [email, 'darryljcousins@gmail.com'],
          subject: "Subscription created",
          html: htmlOutput.html
        });
        const meta = {
          recharge: {
            subscription_id,
            customer_id,
            email: email,
          }
        };
        _logger.notice(`Recharge subscription created email sent.`, { meta });
      });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

