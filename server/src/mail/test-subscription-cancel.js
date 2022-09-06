import sendmail from "./sendmail.js";
import subscriptionCancelledMail from "./subscription-cancelled.js";

global._logger = console;
_logger.notice = console.info;

import data from "../../recharge.cancel.json" assert { type: "json" };

const main = async () => {
  data.admin_email = "darryljcousins@gmail.com";
  try {
    await subscriptionCancelledMail(data);
  } catch(e) {
    console.log(e);
  };

};

main().catch(console.error);


