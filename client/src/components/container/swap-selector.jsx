/**
 * Form for editing quantities
 *
 * @module app/quantity-form
 * @exports {Element} QuantityForm
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import {
  getSetting,
  animateFadeForAction,
} from "../../helpers";
import CollapseWrapper from "../lib/collapse-animator";
import { moveProductEvent, selectorOpenEvent } from "../lib/events";

/**
 * Component to update quantities in box
 *
 * @returns {Element} DOM component
 */
function *SwapSelector({ possibleSwaps, removedItem, confirmSwap, cancelSwap }) {

  for ({possibleSwaps, removedItem} of this) {

    yield (
      <Fragment>
        { removedItem && (
          <Fragment>
            { possibleSwaps.length > 0 ? (
              <Fragment>
                <div>Removing <strong>{ removedItem.shopify_title }</strong>.</div>
                <div>To continue please select a replacement.</div>
                <div class="pill-wrapper">
                  {possibleSwaps.map(el =>
                    <div
                      class="pill available-product pointer"
                      onclick={ () => confirmSwap(el) }
                    >
                      {el.shopify_title}
                    </div>
                  )}
                </div>
              </Fragment>
            ) : (
              <div><span>Unable to swap { removedItem.shopify_title } for a similarly priced item.</span></div>
            )}
          </Fragment>
        )}
      </Fragment>
    );
  };
};

export default CollapseWrapper(SwapSelector);
