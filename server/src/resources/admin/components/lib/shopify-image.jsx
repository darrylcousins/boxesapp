/**
 * Provide some helper methods
 *
 * @module app/recharge/lib
 */

import { createElement, Fragment } from "@b9g/crank";
import { Fetch } from "../lib/fetch";
import { animateFadeForAction } from "../helpers";

async function *ShopifyProductImage({ shopify_title, shopify_product_id }) {

  let loading = true;
  let src = null;
  const id = `image-${shopify_title.replace(/ /g, "-")}`;

  const getImage = async () => {
    const res = await Fetch(`/api/shopify-product-image/${shopify_product_id}`)
      .then(({error, json}) => json ? json : error);
    if (res) {
      const get = (res.image_src) ? await fetch(res.image_src) : null;
      if (get) {
        src = get.url;
        fetch(src).then(data => {
          let target;
          target = target ? target : document.querySelector(`#${id}`);
          loading = false;
          if (target) {
            animateFadeForAction(target, () => this.refresh());
          };
        });
      };
    };
  };

  getImage();

  for await ({ shopify_title } of this) { // eslint-disable-line no-unused-vars
    yield (
      <div class="ba dib v-mid" id={ id } style="width: 3em; height: 3em" >
        { loading ? (
          <div class="skeleton mr1 w-100 h-100" style="width: 3em; height: 3em" />
        ) : (
          <div class="cover mr1 w-100 h-100" style={ `background-image: url("${ src }");` } />
        )}
      </div>
    );
  };
};

export default ShopifyProductImage;
