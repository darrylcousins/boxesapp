import sendmail from "./sendmail.js";

global._logger = console;
_logger.notice = console.info;

const main = async () => {

  sendmail({
    to: ['darryljcousins@gmail.com', 'cousinsd@proton.me'],
    subject: 'Testing a mail with my sendmail',
    text: 'Your message in text', // Optional, but recommended
  })
};

main().catch(console.error);

