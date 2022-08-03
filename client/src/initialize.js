/**
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @listens DOMContentLoaded
 */
import boxApp from "./box-app.js";

const init = () => {

  const page_type = document.querySelector("[role='main']").getAttribute("data-page-type");

  switch (page_type) {
    case "product":
      boxApp.init();
      break;
    case "page":
      break;
  };

};

document.addEventListener("DOMContentLoaded", async () => {
  init();
});
