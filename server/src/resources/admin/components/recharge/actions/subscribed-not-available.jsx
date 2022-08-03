/**
 *
 * @module app/recharge/actions
 */

import { createElement, Fragment } from "@b9g/crank";
import Button from "../../lib/button";
import { PostFetch } from "../../lib/fetch";
import { ShopifyProductImage } from "../lib";

function *SubscribedNotAvailable({ items, box, completed, lists }) {

  const pluralize = (items.length > 1 || items.find(el => el.count > 1));

  const confirmed = () => {
    const options = {continue: true};
    const { callback, caller } = completed;
    caller.dispatchEvent(callback(options));
  };

  const save = async (ev) => {
    console.log('do save');
    console.log('items to be skipped');
    // charge date will be same for them all so add once
    const subscription_ids = [];
    for (const item of items) {
      subscription_ids.push(item.subscription_id);
    };
    return;
    const headers = { "Content-Type": "application/json" };
    const { error, json } = await PostFetch({
      src: "/api/recharge-skip-subscription",
      data: { subscription_id, next_charge_date },
      headers,
    })
      .then((result) => result)
      .catch((e) => ({
        error: e,
        json: null,
      }));
    confirmed();
  };

  for ({ items, box, lists, completed } of this) { // eslint-disable-line no-unused-vars
    yield (
    <Fragment>
      <h4>Subscribed product{ pluralize && "s"} unavailable in the box for { box.delivered }</h4>
      { items.map((el) => (
        <div id={`wrapper-${el.shopify_product_id}`} class="ma1">
          <ShopifyProductImage shopify_product_id={ el.shopify_product_id } />
          <div class="dib v-mid fw6 ml3">{ el.str }{ el.count > 1 && ` (${el.count})` }</div>
          <div class="dib v-mid ml2">will be skipped for this delivery.</div>
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

export default SubscribedNotAvailable;

