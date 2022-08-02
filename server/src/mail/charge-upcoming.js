/*
 * @module mail/charge-upcoming.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import fs from "fs";
import mjml2html from "mjml";
import { Liquid } from 'liquidjs';
import sendmail from "./sendmail.js";
import dotenv from "dotenv";
dotenv.config();

import subscriptionTemplate from "./templates/subscription.js";

/*
 * @function mail/charge-upcoming.js
 * @param (object) data
 */
export default async ({ subscriptions }) => {
  const email = subscriptions[0].attributes.customer.email;
  const charge_id = subscriptions[0].attributes.charge_id;

  const engine = new Liquid();
  const options = {};
  
  try {
    engine
      .parseAndRender(subscriptionTemplate, { subscriptions, env: process.env })
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
`);
        sendmail({
          to: email,
          subject: "Charge upcoming",
          html: htmlOutput.html
        });
        const meta = {
          recharge: {
            charge_id: charge_id,
            email: email,
          }
        };
        _logger.notice(`Recharge charge upcoming email sent.`, { meta });
      });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};
