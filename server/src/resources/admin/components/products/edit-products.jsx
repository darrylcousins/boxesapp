/**
 * Makes component for building a box
 *
 * @module app/product/edit-products
 * @exports EditProducts
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import cloneDeep from "lodash.clonedeep";
import Error from "../lib/error";
import Image from "../lib/image";
import Help from "../lib/help";
import SelectModal from "./select-modal";
import { CloseIcon } from "../lib/icon";
import { groupProducts, weekdays } from "../helpers";
import { toastEvent, productsChangeEvent } from "../lib/events";
import { Fetch } from "../lib/fetch";
import { getSelectModalOptions, isSwappable } from "./select-choices";
import {
  animateFadeForAction,
  matchNumberedString,
  sortObjectByKey,
  toPrice,
  delay,
  LABELKEYS,
  transitionElementHeight,
  getImageUrl,
} from "../helpers";

/**
 * Used by recharge/subscription and order/edit-order and order/create-order
 *
 * @function EditProducts
 * @param {object} props Props
 * @param {object} props.box Box object
 * @param {object} props.properties Property object either an existing subscription or an order
 * @param {object} props.hideDetails Ignore the charge date and other details for display
 * @yields Element
 * @example
 * import {renderer} from '@b9g/crank/dom';
 * renderer.render(<EditProducts box={box} />, document.querySelector('#app'))
 */
function *EditProducts({ box, rc_subscription_ids, hideDetails, properties, nextChargeDate, isEditable, key, id }) {

  // if undefined or null show the details. i.e. for admin to see ids
  const showDetails = !hideDetails;

  const orig_properties = cloneDeep(properties);;
  /**
   * True while loading data from api // box price
   *
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * If fetch returns an error
   *
   * @member {object|string} fetchError
   */
  let fetchError = null;
  /**
   * The properties as read from subscription properties
   *
   * @member {object} boxProperties
   */
  let boxProperties = [];
  /**
   * The properties including box product objects and quantities
   *
   * @member {object} boxLists
   */
  let boxLists = [];
  /**
   * The lists names sorted for flex box rendering
   * looking for a structure like [ "Including", [ "Removed Items", "Swapped Items" ], "Add on Items" ]
   *
   * @member {object} sortedListNames
   */
  //let sortedListNames = [ "Including", "Add on Items", [ "Removed Items", "Swapped Items" ] ];
  let sortedListNames = [ "Including", [ "Removed Items", "Swapped Items" ], "Add on Items" ];
  /**
   * The priced items collected for display
   * Updated by updatePricedItems
   *
   * @member {object|string} pricedItems
   */
  let pricedItems = [];
  /**
   * The total price including added items
   *
   * @member {object|string} boxPrice
   */
  let boxPrice = null;
  /**
   * True if requiring selection from modal
   *
   * @member {boolean} showSelectModal
   */
  let showSelectModal = false;
  /**
   * The options for confirmation/select modal
   *
   * @member {object|string} selectModalOptions
   */
  let selectModalOptions = {
    modalSelectList: null, // the list from which a selection is made
    modalSelect: null, // data describing where to move the selected item
    modalStore: null, // data desscribing where to move the current item
    modalType: null, // additional data controlling appearance of modal
    modalNote: null, // helpful info to display to user
    hideModal: null,
    multiple: false, // can we select multiple products - used only for addProduct
  };

  /**
   * Clear selectModalOptions
   *
   * @function clearSelectModalOptions
   */
  const clearSelectModalOptions = () => {
    const stored = { ...selectModalOptions };
    for (const key of Object.keys(stored)) {
      selectModalOptions[key] = null;
    };
  };

  /**
   * Cancel changes
   * Damn this gave some grief - hence all the cloneDeep all over the place to
   * avoid having child objects with updated data not coming through
   *
   * @function clearSelectModalOptions
   */
  const cancelChanges = async (ev, me) => {
    if (ev.detail.subscription_id === parseInt(properties.box_subscription_id)) {
      ev.stopPropagation();
      properties = cloneDeep(orig_properties);
      boxProperties = cloneDeep(orig_properties);
      boxLists = cloneDeep(boxProperties);
      sortedListNames = cloneDeep(sortedListNames);
      delay(500);
      init();
    };
  };

  window.addEventListener("product.cancel.changes", (ev) => cancelChanges(ev, this) );

  /**
   * Hide the selection modal and cancel the transaction
   *
   * @function hideSelectModal
   * @param {object} ev Event emitted
   * @listens window.keyup
   */
  const hideSelectModal = async (ev) => {

    let target = ev.target;
    if (target.tagName.toLowerCase() === "path") target = target.parentNode.parentNode;
    if (target.tagName.toLowerCase() === "svg") target = target.parentNode;
    if ((target &&
      target.tagName.toLowerCase() === "button" &&
      ["Cancel", "OK", "Close info"].includes(target.title)) || (ev.key && ev.key === "Escape")) {
      showSelectModal = false;
      clearSelectModalOptions();
      await this.refresh(); // how to prevent this call when component is ummounted and therefor the console error?
    };
  };

  window.document.addEventListener("keyup", hideSelectModal);

  /**
   * Map lists and collect extra items to calculate and list prices
   *
   * @function collectCounts
   */
  const collectCounts = () => {
    let start = [];
    const lists = { ...boxLists };
    delete lists["possibleAddons"];
    Object.entries(lists).forEach(([name, products]) => {
      if (products !== null && products.trim() !== "") {
        products
          .split(',')
          .map(el => el.trim())
          .map(el => matchNumberedString(el))
          .forEach(el => {
            if (name === "Including" && el.count > 1) {
              start.push({name: el.title, count: el.count - 1});
            } else if (name === "Swapped Items" && el.count > 1) {
              start.push({name: el.title, count: el.count - 1});
            } else if (name === "Add on Items") {
              start.push({name: el.title, count: el.count});
            };
        });
      };
    });
    start = sortObjectByKey(start, "name");
    return start;
  };

  /**
   * Fetch box price from shopify
   *
   * @function getBoxPrice
   */
  const getBoxPrice = async () => {
    const product_id = box.shopify_product_id;
    let deliveryDate = new Date(Date.parse(box.delivered));
    // just passing the day index of the week - api returns the variant with that title
    let variant_id = deliveryDate.getDay();
    const uri = `/api/shopify-box-price/${product_id}/${variant_id}`;
    return Fetch(uri)
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          this.refresh();
          return null;
        };
        box.shopify_price = json.price;
        this.refresh();
      })
      .catch((err) => {
        fetchError = err;
        this.refresh();
      });
  };

  /**
   * Remove a product from a list
   *
   * @function removeProduct
   * @param {object} props.from_list_name The name of the from list
   */
  const removeProduct = async ({shopify_product_id, from_list_name}) => {
    const product = boxLists[from_list_name].find(el => el.shopify_product_id === shopify_product_id);
    // if only one then move it otherwise seek confirm
    if (product.quantity === 1 && from_list_name.toLowerCase() === "add on items") {
      await moveItem({id: shopify_product_id, from: from_list_name, to: "possibleAddons"});
      this.refresh();
      setTimeout(() => {
        this.dispatchEvent(
          new CustomEvent("collapse.wrapper.resize", {
            bubbles: true,
          })
        );
      }, 100);
    } else {
      selectModalOptions = getSelectModalOptions({
        boxLists,
        shopify_product_id,
        from_list_name
      });
      selectModalOptions.hideModal = hideSelectModal;
      showSelectModal = true;
      this.refresh();
    };
  };

  /**
   * Add a new product to add ons
   *
   * @function addProduct
   * @param {object} props The name of the from list
   * @param {object} props.to_list_name The name of the to list
   */
  const addProduct = ({to_list_name}) => {
    showSelectModal = true;
    selectModalOptions = {
      modalSelectList: groupProducts(boxLists["possibleAddons"]),
      modalSelect: {from: "possibleAddons", to: to_list_name},
      modalType: "add",
      modalNote: (
        <h4 class="fw4 tl fg-streamside-maroon">Select item to add to the box.</h4>
      ),
      hideModal: hideSelectModal,
      modalStore: null,
      multiple: true,
    };
    this.refresh();
  };

  /**
   * Crank element to render number input
   *
   * @function QuantityInput
   * @param {object} props The name of the from list
   * @param {object} props.el The product
   * @param {object} props.id Choosen id for the element
   * @param {object} props.idx The list index
   */
  function *QuantityInput({ el, id, idx }) {
    /*
    return (
      <input
        class="input-reset br1 ba b--silver dib"
        type="number"
        steps="1"
        min="1"
        name="quantity"
        data-id={id}
        data-idx={idx}
        id={inputId}
        value={el.quantity}
        autocomplete="off"
        style="font-size: 1.2rem; width: 3.5em; border-color: silver; padding: 2px 3px; margin: 0"
      />
    );
    */
    const disabled = { "cursor": "not-allowed", "opacity": "0.3" };
    const button = {
      "cursor": "pointer",
      "font-weight": "bold",
      "display": "inline-flex",
      "justify-content": "center",
      "align-items": "center",
      "background": "transparent",
      "color": "inherit",
      "padding-right": "10px",
      "padding-left": "10px",
      //"margin-right": "10px",
      "border": "1px solid",
      "border-radius": "3px",
      "font-size": "larger",
    };
    const buttonRight = {
      "margin-left": "10px",
    };
    const buttonLeft = {
    };
    const buttonPlus = { ...button, ...buttonRight };
    const idPlus = `${Math.random()}`.split(".")[1];
    const idMinus = `${Math.random()}`.split(".")[1];
    for ({ el } of this) {
      yield (
        <div style={ {
          "display": "inline-flex",
          "justify-content": "right",
          "align-items": "right",
          //"padding-right": "10px",
          //"padding-left": "10px",
        } }>
          <div style={ el.quantity === 1 ? { ...button, ...disabled, ...buttonLeft } : { ...button } }
            id={ idMinus }
            data-id={id}
            data-idx={idx}
            data-quantity={el.quantity}
            data-action="minus"
          >
            -
          </div>
          <div style={buttonPlus}
            id={ idPlus }
            data-id={id}
            data-idx={idx}
            data-quantity={el.quantity}
            data-action="plus"
          >
            +
          </div>
        </div>
      );
    };
  };

  /**
   * Collect total calculated price
   *
   * @function totalPrice
   */
  const totalPrice = () => {
    let start = box.shopify_price * 100;
    if (pricedItems.length > 0) {
      for (const el of pricedItems) {
        start += el.price * el.count;
      };
    };
    return start;
  };

  /**
   * Map lists and collect prices to add to pricedItems
   *
   * @function collectPrices
   */
  const collectPrices = async () => {
    pricedItems = pricedItems.map(el => {
      let product = box.includedProducts.find(item => item.shopify_title === el.name);
      if (!product) {
        product = box.addOnProducts.find(item => item.shopify_title === el.name);
      };
      if (!product) {
        if (isEditable) {
          return null;
        } else { // box is out in the future but still to find a display from the current box or order
          const maybe = rc_subscription_ids.find(e => e.title === el.name)
          product = { shopify_price: maybe.price, shopify_product_id: maybe.shopify_product_id };// may be able to get these from rc_subscription_ids?
        };
      };
      const { shopify_price, shopify_product_id } = product;
      return {...el, price: shopify_price, shopify_product_id };
    }).filter(el => Boolean(el));
    pricedItems = sortObjectByKey(pricedItems, "name");
  };

  /**
   * Update pricedItems on changes
   *
   * @function updatePricedItems
   * @param {object} props The data
   * @param {object} props.product The product
   * @param {object} props.count The number counted
   */
  const updatePricedItems = ({ product, count }) => {
    // note that count is product.quantity - 1 for Including and Swapped Items
    let pricedProduct = pricedItems.find(el => el.shopify_product_id === product.shopify_product_id);
    if (!pricedProduct) {
      if (count !== 0) {
        pricedProduct = {
          count,
          price: product.shopify_price,
          name: product.shopify_title,
          shopify_product_id: product.shopify_product_id,
        };
        pricedItems.push(pricedProduct);
      };
    } else {
      if (count === 0) {
        pricedItems.splice(pricedItems.indexOf(pricedProduct), 1);
      } else {
        pricedProduct.count = count;
        pricedItems[pricedItems.indexOf(pricedProduct)] = { ...pricedProduct };
      };
    };
    pricedItems = sortObjectByKey(pricedItems, "name");
    boxPrice = totalPrice() * 0.01;
    setTimeout(() => {
      const el= document.querySelector(`#${id}`);
      transitionElementHeight(el, 50); // need to add the extra
    }, 100);
  };

  /**
   * Helper method for productSelected
   *
   * @function moveItem
   * @param {object} props The name of the from list
   * @param {object} props.from The name of the from list
   * @param {object} props.to The name of the to list
   * @param {object} props.id The id of the item to be moved
   */
  const moveItem = async ({from, to, id}) => {
    //console.log("moveItem", from , to, id);
    const fromList = boxLists[from];
    let toList = boxLists[to];
    let toName = to; // may be changed below
    let fromName = from; // may be changed below

    for (let i = 0; i < fromList.length; i += 1) {
      if (fromList[i].shopify_product_id === id) {

        const product = { ...fromList[i] };
        if (from === "Including" && to === "Removed Items") product.quantity = 0;
        if (from === "Removed Items" && to === "Including") product.quantity = 1;
        // if swapped item has incremented then move quantity - 1 to addons
        if (from === "Swapped Items" && to === "possibleAddons") {
          if (product.quantity > 1) {
            product.quantity -= 1;
            toName = "Add on Items";
            toList = boxLists[toName];
          };
        };
        if (from === "Add on Items" && to === "possibleAddons") {
          product.quantity = 1;
        };

        toList.push(product);
        fromList.splice(i, 1);
        let count = (["Including", "Swapped Items"].includes(toName)) ? product.quantity - 1 : product.quantity;
        count = (toName === "possibleAddons") ? 0 : count;

        updatePricedItems({
          product,
          count,
        });

        // update likes and dislikes
        const targets = ["Swapped Items", "Removed Items", "Add on Items"];
        if (targets.includes(toName) || targets.includes(from)) {
          const likes = [ ...boxLists["Swapped Items"], ...boxLists["Add on Items"] ];
          boxProperties["Likes"] = likes.map(el => el.shopify_title).join(",");
          boxProperties["Dislikes"] = boxLists["Removed Items"].map(el => el.shopify_title).join(",");
        };
        // modal this as info for user
        toName = (toName === "possibleAddons") ? "Available Products" : toName;
        fromName = (fromName === "possibleAddons") ? "Available Products" : fromName;
        const notice = `Moved ${product.shopify_title} from ${fromName} to ${toName}`;
        this.dispatchEvent(toastEvent({
          notice,
          bgColour: "black",
          borderColour: "black"
        }));
        this.dispatchEvent(productsChangeEvent({
          type: { "from": fromName, "to": toName },
          product,
          properties: boxLists,
          total_price: totalPrice(),
        }));
      };
    };
    toList = sortObjectByKey(toList, 'shopify_title');
  };

  /**
   * Using moveItem to move between lists from confirmation from modal
   *
   * @function productSelected
   * @param {object} ev The event object with ev.detail
   * @listens selectProductEvent
   */
  const productSelected = async (ev) => {
    
    const { modalStore, modalSelectList, modalSelect, multiple } = selectModalOptions;
    if (modalStore) {
      await moveItem({
        from: modalStore.from,
        to: modalStore.to,
        id: modalStore.id,
      });
    };

    if (modalSelect && multiple) {

      for (const id of ev.detail.id) {
        await moveItem({
          from: modalSelect.from,
          to: modalSelect.to,
          id,
        });
      };

    } else if (modalSelect) {
      // otherwise simply a confirmation of removal - e.g. removing add ons
      const id = modalSelectList.length === 1 ? modalSelectList[0].shopify_product_id : ev.detail.id;
      // do the moves by calling moveItem
      await moveItem({
        from: modalSelect.from,
        to: modalSelect.to,
        id,
      });
    };

    showSelectModal = false;
    clearSelectModalOptions();
    this.refresh();
    setTimeout(() => {
      this.dispatchEvent(
        new CustomEvent("collapse.wrapper.resize", {
          bubbles: true,
        })
      );
    }, 100);
  };

  this.addEventListener("selectProductEvent", productSelected);

  /**
   * Update boxLists once box is loaded to include all product data
   * Initially the boxLists are simple strings taken from the subscription properties
   *  boxLists = { ...boxProperties };
   *  i.e Beetroot (2),Celeriac ... etc
   * XXX Reminder here that this method initially was used when pass a subscription
   * Performed on load or cancelling actions
   * After this they are then arrays of objects: shopify_title, id, quantity etc
   * If the box is not editable then we don't have true lists to compare to so must fudge it somewhat
   *
   * @member {object|string} updateBoxLists
   */
  const updateBoxLists = async () => {
    // make available and then remove if already an addon or swap
    let orphanedItems = []; // XXX for adding or editing an order?
    // XXX There is another algorithm webhooks/recharge/charge-upcoming to be used here instead
    const possibleAddons = cloneDeep(box.addOnProducts);
    delete boxLists["Delivery Date"];
    delete boxLists["Likes"];
    delete boxLists["Dislikes"];
    delete boxLists["box_subscription_id"];
    Object.entries(boxLists).forEach(([name, str]) => {
      if (str === null || str.toLowerCase() === "none" || str.trim() === "") {
        boxLists[name] = [];
      } else {
        let products = str.split(",").map(el => el.trim()).map(el => matchNumberedString(el));
        products = products.map(el => { 
          let product = box.includedProducts.find(item => item.shopify_title === el.title);
          if (!product) {
            product = box.addOnProducts.find(item => item.shopify_title === el.title);
            if (product) {
              const idx = possibleAddons.indexOf(product);
              possibleAddons.splice(idx, 1);
            } else {
              // really need to find product_id
              orphanedItems.push({list: name, ...el}); // in boxLists but not available in box
            };
          };
          if (!product) {
            if (isEditable || el.title === "") {
              return null;
            } else {
              return { shopify_title: el.title, quantity: el.count }; // still missing a price
            };
          };
          return { ...product, quantity: el.count };
        });
        boxLists[name] = cloneDeep(products.filter(el => Boolean(el))); // remove those that returned null
      };
    });
    // filtered from addOnProducts, renamed here to possibleAddons quantity helps later
    boxLists["possibleAddons"] = cloneDeep(possibleAddons.map(el => ({ ...el, quantity: 1 })));

    orphanedItems = orphanedItems.filter(el => el.title !== "");

    return orphanedItems;
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
        const key = ev.target.getAttribute("data-id");
        const idx = ev.target.getAttribute("data-idx");
        const { value } = ev.target;
        let quantity = parseInt(value, 10);
        if (quantity === 0) {
          this.dispatchEvent(toastEvent({
            notice: "Delete an item by using the x",
            bgColour: "black",
            borderColour: "black"
          }));
          return;
        };
        boxLists[key][idx].quantity = quantity;
        /*
        if (key === "Add on Items" && parseInt(value, 10) === 0) {
          boxLists[key].splice(idx, 1);
        };
        */
        ev.target.blur();
        const count = (["Including", "Swapped Items"].includes(key)) ? quantity - 1 : quantity;

        updatePricedItems({
          product: boxLists[key][idx],
          count,
        });

        animateFadeForAction(document.querySelector("#pricedItems"), () => this.refresh());
        const notice = `Updated ${boxLists[key][idx].shopify_title} to ${quantity}`;
        this.dispatchEvent(toastEvent({
          notice,
          bgColour: "black",
          borderColour: "black"
        }));

        this.dispatchEvent(productsChangeEvent({
          type: { "count": key },
          product: boxLists[key][idx],
          properties: boxLists,
          total_price: totalPrice(),
        }));
      }
    }
  };
  this.addEventListener("change", handleChange);

  /**
   * Handle click on selected input elements
   *
   * @function handleChange
   * @param {object} ev The firing event
   * @listens change
   */
  const handleClick = (ev) => {
    const target = ev.target;
    let action;
    if (target.hasAttribute("data-action")) action = target.getAttribute("data-action");
    if (action) {
      const { value } = ev.target;
      let quantity = parseInt(target.dataset.quantity, 10);
      if (target.dataset.action === "plus") {
        quantity++;
      } else if (target.dataset.action === "minus") {
        quantity--;
      };
      if (quantity === 0) {
        this.dispatchEvent(toastEvent({
          notice: "Delete an item by using the x",
          bgColour: "black",
          borderColour: "black"
        }));
        return;
      };
      const key = ev.target.getAttribute("data-id");
      const idx = ev.target.getAttribute("data-idx");
      boxLists[key][idx].quantity = quantity;
      ev.target.blur();
      const count = (["Including", "Swapped Items"].includes(key)) ? quantity - 1 : quantity;

      updatePricedItems({
        product: boxLists[key][idx],
        count,
      });

      animateFadeForAction(document.querySelector("#pricedItems"), () => this.refresh());
      const notice = `Updated ${boxLists[key][idx].shopify_title} to ${quantity}`;
      this.dispatchEvent(toastEvent({
        notice,
        bgColour: "black",
        borderColour: "black"
      }));

      this.dispatchEvent(productsChangeEvent({
        type: { "count": key },
        product: boxLists[key][idx],
        properties: boxLists,
        total_price: totalPrice(),
      }));
    };
  };
  this.addEventListener("mouseup", handleClick);

  const Title = ({ name, idx }) => {
    return (
      <div class="w-100 bold pt1 dt bg-streamside-blue white" style="height: 2em">
        <div class="dtc pa2">
          { name === "Including" ? (
            <span>Included</span>
          ) : (
            <Fragment>
              <span>{ name }</span> <span class="fw3">{ name === "Removed Items" && "(2 only)" }</span>
            </Fragment>
          )}
        </div>
        { name === "Add on Items" && isEditable && (
          <div class="dtc tr hover-yellow pointer w-10"
            onclick={() => addProduct({to_list_name: name})}
            title={`Add item to ${name}`}>
            <span class="v-mid">
              <span class="dtc pr2" style="font-size: large">+</span>
            </span>
          </div>
        )}
      </div>
    )
  };

  function *Body({properties, name, idx}) {

    const isRemovable = (product, listName) => {
      if (listName !== "Including") return true;

      // do we have a similarly priced item to swap from possible addons?
      const res = isSwappable(boxLists["possibleAddons"], product);

      return res;
    };

    for ({ properties, name, idx } of this) { // eslint-disable-line no-unused-vars

      yield (
        <div class={`w-100 h-100`}>
          {(properties[name] && properties[name].length > 0) ? (
            <ul class="list pl0 mv0">
              { (typeof properties[name] === "string") ? (
                properties[name].split(",").map(() => (
                  <li class="pl1 pt1r">
                    <div class="skeleton mr1" style="height: 2em" />
                  </li>
                ))
              ) : (
                Array.isArray(properties[name]) && (
                  properties[name].map((product, idx, arr) => (
                    <li class={ `pv1 bt b--silver ${idx === arr.length - 1 && name !== "Including" && "bb"}` }>
                      <div class="dt w-100 pl2 pt1 pb1">
                        <div class="dtc w-80">
                          { product.shopify_title } { product.quantity > 1 && `(${ product.quantity })` }
                        </div>
                        <div class="dtc w-10">
                          { !isEditable || name === "Removed Items" ? (
                            <div class="di w-100">&nbsp;</div>
                          ) : (
                            <QuantityInput el={ product } id={ name } idx={ idx } />
                          )}
                        </div>
                        { !isEditable || (name === "Including" && boxLists["Swapped Items"] && boxLists["Swapped Items"].length >= 2) ? (
                          <div class="dtc w-10" data-type="not-editable" title="Not swappable">&nbsp;</div>
                        ) : (
                          isRemovable(product, name) ? (
                            <div class="dtc w-10 tr pr1 hover-dark-red pointer"
                              data-type="removable"
                              onclick={() => removeProduct({shopify_product_id: product.shopify_product_id, from_list_name: name})}
                              role="button"
                              title={`Remove ${product.shopify_title} from ${name}`}>
                              <span class="v-mid">
                                <CloseIcon styleSize="1.35em" />
                              </span>
                            </div>
                          ) : (
                            <div class="dtc w-10" data-type="not-removable">
                              <div class="relative w-100 tr">
                                <Help id={ `info-${product.shopify_product_id}` } size="small" />
                                <p id={ `info-${product.shopify_product_id}` } class="alert-box info info-left tr" role="alert">
                                  No similarly priced products are available in this box.
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </li>
                  ))
                )
              )}
            </ul>
          ) : (
            <div class="pt1 pl1 bt b--silver">None</div>
          )}
        </div>
      );
    };
  };

  /**
   * Initialize data
   *
   * @function init
   */
  const init = async () => {
    if (properties) {
      boxProperties = cloneDeep(orig_properties);
    };
    const propertyKeys = Object.keys(boxProperties);
    for (const key of LABELKEYS) {
      if (!propertyKeys.includes(key)) {
        boxProperties[key] = "";
      };
    };
    boxLists = { ...boxProperties };

    if (boxLists["Including"].trim() === "") {
      boxLists["Including"] = box.includedProducts.map(el => el.shopify_title).join(",");
    };

    pricedItems = collectCounts(); // at this point only the count
    const orphanedItems = await updateBoxLists();
    await collectPrices(); // updates pricedItems to included prices
    loading = false;
    this.refresh();
  };

  const getListData = () => {
    const list = [
      ["Delivery Date", properties["Delivery Date"]],
      ["Price (excl. shipping)", toPrice(totalPrice())],
    ];
    if (nextChargeDate) {
      list.unshift(
        ["Next Order Date", nextChargeDate ? nextChargeDate : "Unscheduled"],
      );
    };
    return list;
  };

  init();

  /*
   * @function testVisiblity
   *
   * Always show add on items - the plus
   * If no Included don't show an empty list
   * No swaps or removed? Don't show them
  */
  const testVisibility = (name) => {
    if (name === "Add on Items") return true;
    if (Array.isArray(name) && name.find(el => boxLists[el].length > 0)) return true;
    if (name === "Including" && boxLists[name].length > 0) return true;
    return false;
  };

  const getLeftBorder = (name, idx) => {
    if (window.innerWidth <= 780) return "";
    if (boxLists["Including"].length === 0) return "";
    if (name === "Including") return "ba";
    if (idx > 0) return "ba bl-0";
    return "";
  };

  const getTopBorder = (name, idx) => {
    if (window.innerWidth <= 780) return "";
    return idx > 0 ? "bt" : "";
  };
  const getWrapperBottomBorder = (name, idx) => {
    if (boxLists["Including"].length === 0) return "bb-0";
    return "";
  };

  const getTableBottomPadding = (name, idx) => {
    if (boxLists["Including"].length === 0) return "";
    if (idx > 0) return "pb2";
    return "";
  };

  const lineHeightStyle = { height: "40px", "line-height": "40px" }
  const lineImageStyle = { "min-width": "40px", height: "40px", width: "40px" };

  // this is handled by collapseAnimator
  //window.addEventListener("resize", (event) => this.refresh() );

  try {

    for (const { properties, nextChargeDate, isEditable, key } of this) { // eslint-disable-line no-unused-vars

      yield (
        <Fragment>
          { showSelectModal && (
            <SelectModal
              { ...selectModalOptions }
            />
          )}
          { fetchError && <Error msg={fetchError} /> }
          <div id={ `overlay-${key}` } class="dn aspect-ratio--object bg-black o-90"></div>
          <div id={ `edit-products-${key}` } class="mt2 ph1 relative w-100" style="font-size: 1.3rem">
            <div class="tc center">
              <h4 class="fw4 tl mb0 fg-streamside-maroon">{box.shopify_title}</h4>
            </div>
            <div class="flex-container w-100">
              <div class="mb2 w-100">
                { !loading && showDetails ? (
                  <Fragment>
                    { getListData().map(([title, value]) => (
                      <div class="dt">
                        <div class="dtc gray tr pr3 pv1">
                          { title }:
                        </div>
                        <div class="dtc pv1">
                          { loading ? (
                            <div class="skeleton mr1" />
                          ) : (
                            <span>{ value }</span>
                          )}
                        </div>
                      </div>
                    ))}
                    </Fragment>
                  ) : (
                    showDetails ? (
                      <div class="w-100">{ " " }</div>
                    )  : ""
                  )
                }
              </div>
              <div id="pricedItems" class="mr2 w-100">
                <div class="ml2 mb0 mt1 pv1 flex-container bt">

                  <div class="w-100">
                    <div class="ma0 dib">
                      { loading ? (
                        <div class="ba skeleton ma0 w-100 h-100" style={ lineImageStyle }>{ " " }</div>
                      ) : (
                        <Image
                          src={ getImageUrl(box.shopify_product_id) }
                          title={ box.shopify_title }
                          id={`image-${key}-${box.shopify_product_id}`}
                          crank-key={`image-${key}-${box.shopify_product_id}`}
                        />
                      )}
                    </div>
                    <div class="dib bold ml2" style={ lineHeightStyle }>
                      { box.shopify_title }
                    </div>
                  </div>

                  <div class="dib b pricing w-100 tr" style={ lineHeightStyle }>
                    { loading ? (
                      <div class="skeleton mr1" />
                    ) : (
                      <span>{ toPrice(box.shopify_price ? box.shopify_price * 100 : null) }</span>
                    )}
                  </div>

                </div>

                { pricedItems.map((el, idx) => (
                  <div class="ml2 mb0 mt1 pv1 flex-container bt">
                    <div class="w-100">
                      <div class="dib ma0">
                        { loading ? (
                          <div class="skeleton mr1 w-100 h-100" style={ lineImageStyle }>
                            <span class="image-loader"></span>
                          </div>
                        ) : (
                          <Image
                            title={ el.name }
                            id={`image-${key}-${el.shopify_product_id}`}
                            crank-key={`image-${key}-${el.shopify_product_id}`}
                            src={ getImageUrl(el.shopify_product_id) }
                          />
                        )}
                      </div>
                      <div class="dib bold ml2 w-60" style={ { ...lineHeightStyle, ...{"text-overflow": "ellipsis"}}}>
                        { el.name }
                      </div>
                      { (true || isEditable) && (el.count > 1) && (
                        <div class="pricing dib tr w-10" style={ lineHeightStyle }>
                          <span>{ toPrice(el.price) }</span>
                        </div>
                      )}
                    </div>

                    { (true || isEditable) && (
                      <div class="dib b pricing w-100 tr" style={ lineHeightStyle }>
                        { el.count > 1 && (
                          <div class="dib tc ml2 w-10" style={ lineHeightStyle }>
                            ({ el.count })
                          </div>
                        )}
                        { loading ? (
                          <div class="skeleton mr1" />
                        ) : (
                          <span>{ toPrice(el.count * el.price) }</span>
                        )}
                      </div>
                    )}

                  </div>
                ))}
                <div class="ml2 mb1 pt1 flex bt">
                  <div class="w-80 bold">Total (excl. shipping)</div>
                  <div class="pricing w-20 tr bold">
                    { loading ? (
                      <div class="skeleton mr1" />
                    ) : (
                      <span>{ toPrice(totalPrice()) }</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div class="flex-container w-100 h-100 mt1 pt2">
              { sortedListNames.map((name, idx) => (
                <Fragment>
                  { Array.isArray(name) && testVisibility(name) ? (
                    <div class={`flex flex-column w-100 b--silver ${ getLeftBorder(name, idx) }`}>
                      { name.map((item, index) => (
                        <div class={`w-100 h-100 flex flex-column b--silver ${ getTopBorder(name, index) }`}>
                          <Title name={ item } idx={ idx } />
                          <div class="w-100">
                            <Body properties={ boxLists } name={ item } idx={ idx } />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    testVisibility(name) && (
                      <div id={ name } class={`w-100 flex flex-column ${ getLeftBorder(name, idx) } ${ getWrapperBottomBorder(name, idx) } b--silver`}>
                        <Title name={ name } idx={ idx } />
                        <div class={ `w-100 ${ getTableBottomPadding(name, idx) }` }>
                          <Body properties={ boxLists } name={ name } idx={ idx } />
                        </div>
                      </div>
                    )
                  )}
                </Fragment>
              ))}
            </div>
          </div>
          <div class="pa1">&nbsp;</div>
        </Fragment>
      );
    };
  } finally {
    window.document.removeEventListener("keyup", hideSelectModal);
  };

};

export default EditProducts;
