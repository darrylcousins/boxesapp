/**
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import boxApp from "./src/box-app";

import "./styles/app.scss";
import "./styles/styles.scss";

const init = async () => {

  /* this worked on other themes but not with the Taste theme
  const page_type = document.querySelector("[role='main']").getAttribute("data-page-type");

  if (page_type !== "product") return;
  */


  // this is how I can test for product page with the Taste theme
  if (document.querySelector("product-info")) {
    const productJson = await JSON.parse(document.getElementById("product-json").textContent);

    if (productJson.type !== "Container Box" && productJson.type !== "Box Produce") {
      return;
    };

    const cartData = document.querySelector("#cart-json");
    const cartJson = await JSON.parse(cartData.textContent);

    boxApp.init({ productJson, cartJson });
  } else {
    return;
  };

};

document.addEventListener("DOMContentLoaded", async () => {
  await init();
});
