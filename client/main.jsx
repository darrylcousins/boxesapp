/**
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { renderer } from "@b9g/crank/dom";
import BoxApp from "./src/box-app";

import "./styles/app.scss";
import "./styles/styles.scss";

const init = () => {

  const page_type = document.querySelector("[role='main']").getAttribute("data-page-type");

  switch (page_type) {
    case "product":
      BoxApp.init();
    case "page":
      break;
  };

};

document.addEventListener("DOMContentLoaded", async () => {
  init();
});
