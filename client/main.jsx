/**
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import boxApp from "./src/box-app";

import "./styles/app.scss";
import "./styles/styles.scss";

const init = async () => {

  let boxAppInit = false;

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
    return false;
  };
};

document.addEventListener("DOMContentLoaded", async () => {
  await init();
});
window.addEventListener("QuickAddLoaded", async () => {
  await init();
});
