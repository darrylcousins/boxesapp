import sendmail from "./sendmail.js";
import chargeUpcomingMail from "./charge-upcoming.js";

global._logger = console;
_logger.notice = console.info;

import subscriptions from "../../recharge.upcoming.json" assert { type: "json" };
const admin_email = "darryljcousins@gmail.com";

const main = async () => {
  try {
    await chargeUpcomingMail({ subscriptions, admin_email });
  } catch(e) {
    console.log(e);
  };

};

main().catch(console.error);

