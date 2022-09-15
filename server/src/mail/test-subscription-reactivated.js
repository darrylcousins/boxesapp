import sendmail from "./sendmail.js";
import subscriptionReactivatedMail from "./subscription-reactivated.js";

global._logger = console;
_logger.notice = console.info;

import data from "../../recharge.delete.json" assert { type: "json" };

const main = async () => {
  data.admin_email = "darryljcousins@gmail.com";
  try {
    await subscriptionReactivatedMail(data);
  } catch(e) {
    console.log(e);
  };

};

main().catch(console.error);



