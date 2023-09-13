/**
 * Form for editing quantities
 *
 * @module app/quantity-form
 * @exports {Element} QuantityForm
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { moveProductEvent, quantityUpdateEvent } from "../lib/events";
import {
  toPrice,
  getPrice,
  getSetting,
  animateFadeForAction
} from "../../helpers";
import CollapseWrapper from "../lib/collapse-animator";

/**
 * Component to update quantities in box
 *
 * @returns {Element} DOM component
 */
function *QuantityForm({ selectedIncludes, selectedAddons, selectedSwaps }) {

  const TitleInput = ({ el, includes }) => {
    if (!Object.hasOwnProperty.call(el, "quantity")) el.quantity = 1; 
    const showPrice = !includes || (includes && el.quantity > 1);

    return (
      <div style="display: inline-block; width: 90%">
        { `${el.shopify_title} ${ showPrice ? `(${getPrice(el, includes)})` : "" }` }
      </div>
    );
  };

  const QuantityInput = ({ el, id }) => {
    // Should look in moveProduct to find where the quantity is not set
    if (!Object.hasOwnProperty.call(el, "quantity")) el.quantity = 1;
    return (
      <div style="display: inline-block; width: 10%; text-align: right; padding-right: 10px;">
        <input
          class="quantity__input"
          type="number"
          steps="1"
          min={ id === "selectedIncludes" ? 1 : 0 }
          name="quantity"
          data-id={id}
          id={el.shopify_product_id}
          value={el.quantity}
          autocomplete="off"
        />
      </div>
    );
  };

  const PriceInput = ({ el, includes }) => {
    // Should look in moveProduct to find where the quantity is not set
    if (!Object.hasOwnProperty.call(el, "quantity")) el.quantity = 1; 
    return (
      <input
        class="input-price"
        type="text"
        readonly
        name="title"
        value={getPrice(el, includes)}
      />
    );
  };

  /** 
   * Map strings to the lists
   *
   * @function listMap
   */
  const listMap = (str) => {
    let list;
    switch(str) {
      case 'selectedAddons':
        list = selectedAddons;
        break;
      case 'selectedIncludes':
        list = selectedIncludes;
        break;
      case 'selectedSwaps':
        list = selectedSwaps;
        break;
    }
    return list;
  }
  /**
   * Handle change on selected input elements
   *
   * @function handleChange
   * @param {object} ev The firing event
   * @listens change
   */
  const handleChange = (ev) => {
    if (ev.target.tagName === "INPUT") {
      if (ev.target.name === "quantity") {
        if (ev.target.value === "0") {
          animateFadeForAction(ev.target.parentNode, async () => {
            await this.dispatchEvent(quantityUpdateEvent(ev.target.id, ev.target.value, ev.target.getAttribute("data-id")));
          });
        } else {
          this.dispatchEvent(quantityUpdateEvent(ev.target.id, ev.target.value, ev.target.getAttribute("data-id")));
        };
      };
    };
  };
  this.addEventListener("change", handleChange);

  /*
                <PriceInput el={el} includes={true} />
                    <PriceInput el={el} includes={false} />
                    <PriceInput el={el} includes={true} />
   */

  for ({selectedIncludes, selectedAddons, selectedSwaps} of this) {
    yield (
      <div class="relative">
        <div id="quantityModal">
          <div class="listing-wrapper">
            { selectedIncludes.length > 0 && (
              <Fragment>
                <div class="listing-title">
                  Included items:
                </div>
                {selectedIncludes.map(el => 
                  <div class="input-wrapper">
                    <TitleInput el={el} includes={true}  />
                    <QuantityInput el={el} id="selectedIncludes" />
                  </div>
                )}
              </Fragment>
            )}
            {(selectedAddons.length > 0) && (
              <Fragment>
                <div class="listing-title">
                  Add on items:
                </div>
                {selectedAddons.map(el => 
                  <div class="input-wrapper">
                    <TitleInput el={el} includes={false}  />
                    <QuantityInput el={el} id="selectedAddons" />
                  </div>
                )}
              </Fragment>
            )}
            {(selectedSwaps.length > 0) && (
              <Fragment>
                <div class="listing-title">
                  Swapped items:
                </div>
                {selectedSwaps.map(el => 
                  <div class="input-wrapper">
                    <TitleInput el={el} includes={true}  />
                    <QuantityInput el={el} id="selectedSwaps" />
                  </div>
                )}
              </Fragment>
            )}
          </div>
        </div>
      </div>
    )
  }
};

//export default QuantityForm;
export default CollapseWrapper(QuantityForm);
