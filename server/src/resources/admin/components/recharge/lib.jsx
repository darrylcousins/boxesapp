/**
 * Provide some helper methods
 *
 * @module app/recharge/lib
 */

import { createElement, Fragment } from "@b9g/crank";
import { Fetch } from "../lib/fetch";
import { animateFadeForAction } from "../helpers";

export function *ShopifyProductImage({ shopify_product_id, shopify_title }) {

  let src = null;
  const id = (shopify_product_id)
    ? `image-${shopify_product_id}`
    : `image-${shopify_title.replace(" ", "-")}`;

  const getImage = async (product_id) => {
    const res = await Fetch(`/api/shopify-product-image/${product_id}`)
      .then(({error, json}) => json.image_src);
    //let target = document.querySelector(`#wrapper-${shopify_product_id}`);
    const get = (res) ? await fetch(res) : null;
    if (get) {
      src = get.url;
      await fetch(src);
      let target;
      target = target ? target : document.querySelector(`#${id}`);
      animateFadeForAction(target, () => this.refresh());
      this.refresh();
    };
  };

  const getProduct = async () => {
    const product_id = await Fetch(`/api/get-product-by-title/${shopify_title}`)
      .then(({error, json}) => {
        return (json.product_id) ? json.product_id : null;
      });
    if (product_id) {
      getImage(product_id);
    };
  };

  if (shopify_product_id) {
    getImage(shopify_product_id);
  } else if (shopify_title) {
    getProduct();
  };

  for ({ shopify_product_id, shopify_title } of this) { // eslint-disable-line no-unused-vars
    yield (
      <div class="dib v-mid" id={ id } style="width: 5em; height: 5em" >
        { src ? (
          <img src={ src } class="bg-black-20 mw4 v-mid ma2" style="width: 4.5em; height: 4.5em" />
        ) : (
          <div class="bg-black-20 ma2 dib v-mid" style="width: 4.5em; height: 4.5em" />
        )}
      </div>
    );
  };
};

