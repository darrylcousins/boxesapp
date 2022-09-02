import sendmail from "./sendmail.js";

global._logger = console;
_logger.notice = console.info;

const main = async () => {

  sendmail({
    to: ['darryljcousins@gmail.com', 'cousinsd@proton.me'],
    subject: "\[test\] Testing a mail with my sendmail",
    text: 'Your message in text', // Optional, but recommended
    html: "<html><body>Hello world, this is a test.</body></html>",
  })
};

main().catch(console.error);

