/*
 * @module mail/build-mail.js
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import mjml2html from "mjml";
import { Liquid } from 'liquidjs';
import sendmail from "./sendmail.js";
import "dotenv/config";

import subscriptionTemplate from "./templates/subscription.js";

/*
 * @function mail/charge-upcoming.js
 * @param (object) data
 */
export default async (opts) => {

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  let admin_email = _mongodb.collection("settings").findOne({handle: "admin-email"});
  if (admin_email) admin_email = admin_email.value;

  // test for logo files
  const siteLogoFile = "logo.jpg"; // put in .env
  const boxesLogoFile = "boxes.png"; // put in .env

  const siteLogo = fs.existsSync(path.resolve(process.env.SERVER_ROOT, "assets/logos", siteLogoFile));
  const boxesLogo = fs.existsSync(path.resolve(process.env.SERVER_ROOT, "assets/logos", boxesLogoFile));

  const engine = new Liquid({
    root: path.resolve(__dirname, 'templates/'),  // root for layouts/includes lookup
    extname: '.liquid'
  });
  const options = {
    keepComments: false,
  };
  
  try {
    engine
      .renderFile(opts.templateFile, {
        ...opts,
        boxesLogo,
        siteLogo,
        env: process.env,
        admin_email: process.env.ADMIN_EMAIL,
      })
      .then(body => {
        const htmlOutput = mjml2html(`
<mjml>
  <mj-body>
    ${body}
  </mj-body>
</mjml>
`, options);

        sendmail({
          to: `${opts.to}`,
          bcc: `${process.env.BCC_EMAIL}`,
          subject: `${process.env.EMAIL_SUBJECT} ${opts.subject}`.trim(),
          html: htmlOutput.html
        });
        const meta = {
          recharge: opts.meta
        };
        _logger.notice(`Recharge ${opts.title.toLowerCase()} email sent.`, { meta });
      });

  } catch(err) {
    _logger.error({message: err.message, level: err.level, stack: err.stack, meta: err});
  };
};

