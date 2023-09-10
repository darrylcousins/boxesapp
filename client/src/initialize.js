/**
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @listens DOMContentLoaded
 *
 *
 * XXX This file is no longer read - see main.jsx
 */
import boxApp from "./box-app.js";

const init = async () => {

  const page_type = document.querySelector("[role='main']").getAttribute("data-page-type");

  console.log(document.querySelector("product-form"));

  switch (page_type) {
    case "product":
      await boxApp.init();
      break;
    case "page":
      break;
  };

};

document.addEventListener("DOMContentLoaded", async () => {
  await init();
});
