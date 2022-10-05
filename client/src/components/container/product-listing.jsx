/**
 * The box produst component used by product-selector
 * Exported wrapped in animation wrapper
 *
 * @module app/components/container/productAddons
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

import CollapseWrapper from "../collapse-animator";
import {
  getSetting,
  sortObjectByKeys,
  getPrice,
} from "./../../helpers";

/**
 * Box products display, shows included as well as excluded items and addons
 *
 * @yields {Element} DOM component
 */
function* ProductListing({possibleProducts, name, title, type}) {

  const groupAddons = (listing) => {
    if (!name === 'addItem') {
      return {"included": listing};
    };
    const grouped = {};
    let tag;
    for (const addon of listing) {
      tag = addon.shopify_tag;
      if (!Object.hasOwnProperty.call(grouped, tag)) {
        grouped[tag] = [];
      };
      grouped[tag].push(addon);
    };

    return sortObjectByKeys(grouped, {reverse: true});
  };

  const getTitle = (el) => {
    if (type === "excluded") {
      return el.shopify_title;
    } else {
      return `${el.shopify_title} ${getPrice(el)}`;
    };
  };

  for ({possibleProducts, name, title, type} of this) {
    yield (
      <Fragment>
        { Object.entries(groupAddons(possibleProducts)).map(([tag, products]) => (
          <div name="hasChildren">
            <div class="listing-title" style="font-size: smaller; clear: both;">{ tag }</div>

            <div class="pill-wrapper">
              {products.map(el =>
                <div
                  class="pill pointer"
                  style={{
                    "color": getSetting("Colour", `${type}-product-fg`),
                    "background-color": getSetting("Colour", `${type}-product-bg`),
                    "border-color": getSetting("Colour", `${type}-product-bg`)
                  }}
                  data-item={el.shopify_product_id}
                  data-title={el.shopify_title}
                  name={name}
                  title={title}
                >
                    &nbsp;{getTitle(el)}&nbsp;
                </div>
              )}
            </div>
          </div>
        ))}
      </Fragment>
    )
  }
};

export default CollapseWrapper(ProductListing);
