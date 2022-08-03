/**
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import boxApp from "./src/box-app";

import "./styles/app.scss";
import "./styles/styles.scss";

const init = () => {

  const page_type = document.querySelector("[role='main']").getAttribute("data-page-type");

  switch (page_type) {
    case "product":
      boxApp.init();
    case "page":
      break;
  };

};

document.addEventListener("DOMContentLoaded", async () => {
  init();
});
