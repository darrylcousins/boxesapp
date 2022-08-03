/**
 *
 * @module app/recharge/actions
 */

import { createElement, Fragment } from "@b9g/crank";
import Button from "../../lib/button";
import { ShopifyProductImage } from "../lib";

function *OrphanedItems({ items, box, completed, lists }) {

  const pluralize = (items.length > 1 || items.find(el => el.count > 1));

  const confirmed = () => {
    const options = {continue: true};
    const { callback, caller } = completed;
    caller.dispatchEvent(callback(options));
  };

  const save = (ev) => {
    console.log('do save');
    // first fix is if it is a swapped item and will need replacing
    const swapped = items.map(el => el.list === "Swapped Items");
    if (swapped.length > 1) {
      console.log("need a swap for", swapped);
    };
    // secondly if count > 1 if swapped or includes and count for add ons
    // we need to skip or cancel the subscription if it exists
    // this may be taken care of with the other lists
    confirmed();
  };

  for ({ items, box, lists, completed } of this) { // eslint-disable-line no-unused-vars
    yield (
    <Fragment>
      <h4>Product{ pluralize && "s"} unavailable in the box for { box.delivered }</h4>
      { items.map((el) => (
        <div id={`wrapper-${el.shopify_product_id}`} class="ma1">
          <ShopifyProductImage shopify_title={ el.str } />
          <div class="dib v-mid fw6 ml3">{ el.str }{ el.count > 1 && ` (${el.count})` }</div>
          <div class="dib v-mid ml2">will be removed for this delivery.</div>
        </div>
      ))}
      <div class="w-100 tc">
        <Button
          type="primary"
          onclick={ save }
        >
          OK
        </Button>
      </div>
    </Fragment>
    );
  };
};

export default OrphanedItems;
