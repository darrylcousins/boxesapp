/**
 * Provide some helper methods
 *
 * @module app/recharge/lib
 */

import { createElement, Fragment } from "@b9g/crank";
import { Fetch } from "../lib/fetch";
import { animateFadeForAction } from "../helpers";

/**
 * Was initially using api call to shopify to get the product thumbnail, which
 * often meant the image was missing so now storing thumbnails locally (see
 * cronjobs/product-thumbnails, also updating when admin adds products to
 * boxes.
 *
 * @function ShopifyProductImage
 */
async function *ShopifyProductImage({ shopify_title, shopify_product_id, size, id }) {

  let loading = true;
  let src = null;
  let width = size ? size : "3em";
  let key = id ? id : `image-${shopify_title.replace(/ |\(|\)/g, "-")}`;

  const getImage = async () => {
    const host = localStorage.getItem("host");
    src = `${host}/product-images/${shopify_product_id}.jpg`;
    let error = null;
    fetch(src).then(data => {
      let target;
      target = target ? target : document.querySelector(`#${key}`);
      loading = false;
      if (target) {
        animateFadeForAction(target, () => this.refresh());
      };
    });
  };

  getImage();

  for await ({ shopify_title, shopify_product_id } of this) { // eslint-disable-line no-unused-vars
    yield (
      <div class="ba dib v-mid" id={ key } crank-key={ key }
        style={`width: ${width}; height: ${width}`}
      >
        { loading ? (
          <div class="skeleton mr1 w-100 h-100"
          style={`width: ${width}; height: ${width}`}
          />
        ) : (
          <div class="cover mr1 w-100 h-100"
            title={ shopify_title }
            style={ `background-image: url(${ src });` } />
        )}
      </div>
    );
  };
};

export default ShopifyProductImage;
