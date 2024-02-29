/**
 * The box produst component used by product-selector
 * Exported wrapped in animation wrapper
 *
 * @module app/components/container/productAddons
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

import CollapseWrapper from "../lib/collapse-animator";
import { moveProductEvent, selectorOpenEvent } from "../lib/events";
import {
  hasOwnProp,
  getSetting,
  animateFadeForAction,
  sortObjectByKeys,
  getPrice,
} from "./../../helpers";

/**
 * Box products display, shows included as well as excluded items and addons
 *
 * @yields {Element} DOM component
 */
function* ProductAddons({possibleAddons}) {

  const groupAddons = (addons) => {
    const grouped = {};
    let tag;
    for (const addon of addons) {
      tag = addon.shopify_tag;
      if (!Object.hasOwnProperty.call(grouped, tag)) {
        grouped[tag] = [];
      };
      grouped[tag].push(addon);
    };

    return sortObjectByKeys(grouped, {reverse: true});
  };

  for ({possibleAddons} of this) {
    yield (
      <Fragment>
        { Object.entries(groupAddons(possibleAddons)).map(([tag, products]) => (
          <Fragment>
            <div class="listing-title">{ tag }</div>

            <div class="pill-wrapper">
              {products.map(el =>
                <div
                  class="pill pointer available-product"
                  data-item={el.shopify_product_id}
                  data-title={el.shopify_title}
                  name="addItem"
                  title="Add to your box"
                >
                    {el.shopify_title} {getPrice(el)}
                </div>
              )}
            </div>
          </Fragment>
        ))}
      </Fragment>
    )
  }
};

//export default ProductAddons;
export default CollapseWrapper(ProductAddons);
