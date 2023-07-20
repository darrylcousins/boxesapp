/*
 * @module mail/charge-upcoming.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import fs from "fs";
import mjml2html from "mjml";
import { Liquid } from 'liquidjs';
import sendmail from "./sendmail.js";
import "dotenv/config";

import cleanSubscriptionsTemplate from "./templates/clean-subscriptions.js";

/*
 * @function mail/clean-subscriptions.js
 * @param (object) data
 */
export default async ({ orphans}) => {

  const engine = new Liquid();
  const options = {
    keepComments: false,
  };
  
  try {
    engine
      .parseAndRender(cleanSubscriptionsTemplate, {
        orphans,
        env: process.env,
      })
      .then(sections => {
        const htmlOutput = mjml2html(`
    <mjml>
      <mj-body>
        <mj-section padding-bottom="0px">
          <mj-column>
            <mj-text align="center" font-size="20px" font-style="bold">
            Clean subscriptions
            </mj-text>
          </mj-column>
        </mj-section>
    ${sections}
  </mj-body>
</mjml>
`, options);
        sendmail({
          to: `${process.env.ADMIN_EMAIL}, ${process.env.SERVER_EMAIL}`,
          subject: `\[${process.env.SHOP_NAME}\] Clean subscriptions`,
          html: htmlOutput.html
        });
      });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

