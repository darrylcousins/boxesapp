/**
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import boxApp from "./src/box-app";

import "./styles/app.scss";
import "./styles/styles.scss";

const init = async () => {

  const page_type = document.querySelector("[role='main']").getAttribute("data-page-type");

  if (page_type !== "product") return;

  const productJson = await JSON.parse(document.getElementById("product-json").textContent);

  if (productJson.type !== "Container Box" && productJson.type !== "Box Produce") {
    return;
  };

  const cartData = document.querySelector("#cart-json");
  const cartJson = await JSON.parse(cartData.textContent);

  boxApp.init({ productJson, cartJson });

};

document.addEventListener("DOMContentLoaded", async () => {
  await init();
});
