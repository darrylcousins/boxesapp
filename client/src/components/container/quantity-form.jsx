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
  animateFadeForAction,
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
      <div style="display: inline-block; width: 70%">
        { `${el.shopify_title} ${ showPrice ? `(${getPrice(el, includes)})` : "" }` }
      </div>
    );
  };

  const QuantityInput = ({ el, id }) => {
    // Should look in moveProduct to find where the quantity is not set
    if (!Object.hasOwnProperty.call(el, "quantity")) el.quantity = 1;
    const min = id === "selectedIncludes" ? 1 : 0;
    const disabled = { "cursor": "not-allowed", "opacity": "0.5" };
    const button = {
      "cursor": "pointer",
      "font-weight": "bold",
      "font-size": "1.4em",
      "display": "inline-flex",
      "justify-content": "center",
      "align-items": "center",
      "background": "transparent",
      "color": "inherit",
      "padding-right": "10px",
      "padding-left": "10px",
      "margin-right": "10px",
      "border": "1px solid",
      "border-radius": "3px",
    };
    const buttonRight = {
    };
    const buttonLeft = {
      "margin-right": "10px",
    };
    const buttonMinus = el.quantity === min ? { ...button, ...disabled, ...buttonLeft } : { ...button };
    return (
      <div style={ {
        "display": "inline-flex",
        "justify-content": "right",
        "align-items": "right",
        "width": "30%",
        //"padding-right": "10px",
        "padding-left": "10px",
      } }>
        <div style={buttonMinus}
          data-id={id}
          data-product={el.shopify_product_id}
          data-quantity={el.quantity}
          data-action="minus"
        >
          -
        </div>
        <div style={button}
          data-id={id}
          data-product={el.shopify_product_id}
          data-quantity={el.quantity}
          data-action="plus"
        >
          +
        </div>
      </div>
    );
  };

  /*
        <input
          style={{
            "padding-right": "10px",
            "padding-left": "10px",
          }}
          class="quantity__input"
          type="number"
          steps="1"
          min={ min }
          name="quantity"
          data-id={id}
          id={el.shopify_product_id}
          value={el.quantity}
          autocomplete="off"
        />
        */
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
    };
    return list;
  };

  /**
   * Handle click on selected input elements
   *
   * @function handleClick
   * @param {object} ev The firing event
   * @listens change
   */
  const handleClick = (ev) => {
    if (ev.target.tagName === "DIV") {
      const dataId = ev.target.getAttribute("data-id");
      const dataProduct = ev.target.getAttribute("data-product");
      const dataQuantity = parseInt(ev.target.getAttribute("data-quantity"));
      const dataAction = ev.target.getAttribute("data-action");

      if (dataQuantity === 0) return; // should never really happen but don't want negatives

      let quantity;
      if (dataAction === "plus") quantity = dataQuantity + 1;
      if (dataAction === "minus") quantity = dataQuantity - 1;

      if (dataId === "selectedIncludes" && quantity === 0) return;

      this.dispatchEvent(quantityUpdateEvent(dataProduct, quantity, dataId));
    };
  };

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
        console.log(ev.keyCode);
        if (ev.keyCode && ev.keyCode === 8 || ev.keyCode === 46) return;
        console.log(ev.target.value);
        if (ev.target.value === "0") {
          animateFadeForAction(ev.target.parentNode, async () => {
            await this.dispatchEvent(quantityUpdateEvent(ev.target.id, ev.target.value, ev.target.getAttribute("data-id")));
          });
          ev.target.blur();
        } else {
          this.dispatchEvent(quantityUpdateEvent(ev.target.id, ev.target.value, ev.target.getAttribute("data-id")));
          ev.target.blur();
        };
      };
    };
  };
  this.addEventListener("change", handleChange);
  this.addEventListener("keyup", handleChange);
  this.addEventListener("mouseup", handleClick);

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
