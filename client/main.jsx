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
  if (document.querySelector("#boxesapp")) {

    const productJsonEl = document.getElementById("product-json");
    if (!productJsonEl) return;

    let productJson;
    try {
      productJson = await JSON.parse(productJsonEl.textContent);
    } catch(e) {
      console.warn(e.message);
      return;
    };

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
window.addEventListener("QuickAddLoaded", async () => {
  await init();
});
