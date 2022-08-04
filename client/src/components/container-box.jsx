/**
 * Renders the available products for the the box, allows user to add and
 * remove items, picks up items already in cart
 * Renders [crank]{@link https://www.npmjs.com/@bikeshaving/crank} elements
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module app/initialize
 * @requires @bikeshaving/crank
 * @listens DOMContentLoaded
 */
//import "regenerator-runtime/runtime"; // regeneratorRuntime error
import { createElement, Fragment } from "@b9g/crank";
import { renderer } from "@b9g/crank/dom";

import Error from "./error";
import BarLoader from "./bar-loader";
import SelectMenu from "./select-menu";
import { Fetch, PostFetch } from "./fetch";
import { selectVariantEvent,
  selectSellingPlanEvent,
  selectDateEvent,
  moveProductEvent,
  quantityUpdateEvent } from "./events";
import Popup from "./popup";
import DateSelector from "./container/date-selector";
import VariantSelector from "./container/variant-selector";
import BoxProducts from "./container/box-products";
import QuantityForm from "./container/quantity-form";
import ProductSelector from "./container/product-selector";
import SellingPlans from "./container/selling-plans";
import {
  animationOptions,
  hasOwnProp,
  animateFadeForAction,
  sortObjectByKey,
  findGetParameter,
  shallowEqual,
  getSetting,
  getRules,
  matchNumberedString,
} from "../helpers";

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/**
 * ContainerBoxApp crank component
 *
 * @generator ContainerBoxApp
 * @param {object} props The property object
 * @param {object} props.productJson Shopify product data as extracted from
 * product page json script tag
 * @yields {Element} A crank DOM component
 */
async function* ContainerBoxApp({ productJson, cartJson }) {
  /**
   * If fetching data was unsuccessful.
   *
   * @member fetchError
   * @type {object|string|null}
   */
  let fetchError = null;
  /**
   * Box rules for the box - displayed to user on date selection
   *
   * @member boxRules
   * @type {array|null}
   */
  let boxRules = null;
  /**
   * Display loading indicator while fetching data
   *
   * @member loading
   * @type {boolean}
   */
  let loading = true;
  /**
   * Contains box data as collected from [api/current-boxes-by-product]{@link
   * module:api/current-boxes-by-product}. The data uses delivery date as keys to unsorted
   * array of box data.
   *
   * @member fetchJson
   * @type {object}
   */
  let fetchJson = {};
  /**
   * Upcoming delivery dates, same as Object.keys(fetchJson)
   *
   * @member fetchDates
   * @type {object}
   */
  let fetchDates = [];
  /**
   * The box contains no products at all so no listing nor customisation
   *
   * @member boxIsEmpty
   * @type {boolean}
   */
  let boxIsEmpty = false;
  /**
   * The selected variant after user select, or a default variant if only one
   *
   * @member selectedVariant
   * @type {object}
   */
  let selectedVariant;
  /**
   * The selected selling after user select, if available
   *
   * @member selectedSellingPlanId
   * @type {object}
   */
  let selectedSellingPlanId;
  /**
   * The selected date after user select, one of fetchJson.keys
   *
   * @member selectedDate
   * @type {string}
   */
  let selectedDate;
  /**
   * The selected box : fetchJson[selectedDate]
   *
   * @member selectedBox
   * @type {object}
   */
  let selectedBox;
  /**
   * Items included in the box, initially matches selectedBox.includedProducts unless pulling from cart data
   * but can be edited by the user
   *
   * @member selectedIncludes
   * @type {Array}
   */
  let selectedIncludes = [];
  /**
   * Items that can be included in the box, initially matches selectedBox.addOnProducts unless pulling from cart data
   *
   * @member possibleAddons
   * @type {Array}
   */
  let possibleAddons = [];
  /**
   * Items excluded from the box by the user - can only be items initially in selectedBox.includedProducts
   *
   * @member selectedExcludes
   * @type {Array}
   */
  let selectedExcludes = [];
  /**
   * Items added to the box by the user, can only be items found in selectedBox.addOnProducts
   *
   * @member selectedAddons
   * @type {Array}
   */
  let selectedAddons = [];
  /**
   * Items that have been substituted (swappped) from possibleAddons when removed from includedProducts
   *
   * @member selectedSwaps
   * @type {Array}
   */
  let selectedSwaps = [];
  /**
   * A matched array of swapped items so they may be restored
   *
   * @member swapMap
   * @type {object}
   */
  let swapMap = {"selectedSwaps": [], "selectedIncludes": []};
  /**
   * The total price TODO here in development udating on refresh - production
   * may actuall use priceElement as above
   *
   * XXX allow selection of variant before loading box
   *
   * @member priceElement
   * @type {Element}
   */
  let showBoxActive = false;
  /**
   * Show box customize options - used to animate in the options
   *
   * @member editBoxActive
   * @type {boolean}
   */
  let editBoxActive = false;
  /**
   * Show box customize options - used to animate in the options
   *
   * @member customizingBox
   * @type {boolean}
   */
  let customizingBox = false;
  /**
   * Display edit quantities form modal
   *
   * @member modalQtyForm
   * @type {boolean}
   */
  let modalQtyForm = false;
  /**
   * Have we loaded data from an existing cart?
   *
   * @member loadedFromCart
   * @type {boolean} false
   */
  let loadedFromCart = false;
  /**
   * Hold on to the product id of the box in the cart, useful to easily check
   * if this box is the same as in the cart, particulary as we only allow one
   * box per order
   *
   * @member cartBoxId
   * @type {number} false
   */
  let cartBoxId = null;
  /**
   * Display popup warning on adding to cart
   *
   * @member showWarningPopup
   * @type {boolean}
   */
  let showWarningPopup = false;
  /**
   * Make up a string price
   *
   * @param {number} num The integer number to use
   * @returns {string} Price string
   */
  const priceToCurrency = (num) => `$${(num * 0.01).toFixed(2)}`;
  /**
   * Load the product item lists after selectedBox is made and again after date is selected/changed
   * Remember that selectedExcludes and selectedAddons are set up on init if
   * there is a cart but thereafter only on user interaction
   *
   * @function loadBox
   */
  const loadBox = () => {

    const checkLoadPresence = (el) => {
      const found = selectedIncludes.find(ob => ob.shopify_title === el.shopify_title);
      if (typeof found === "undefined") return false;
      return found;
    }

    const findOnFilter = (list, el) => {
      if (list) {
        return list.find(ob => ob.shopify_title === el.shopify_title);
      }
      return false;
    }

    selectedIncludes = selectedBox.includedProducts.map(el => {
        const item = {...el};
        const found = checkLoadPresence(el);
        item.quantity = found ? found.quantity : 1;
        return item;
      })
      .filter(el => !findOnFilter(selectedExcludes, el));

    possibleAddons = selectedBox.addOnProducts.map(el => {
        const item = {...el};
        item.quantity = 1;
        return item;
      })
      .filter(el => !findOnFilter(selectedBox.includedProducts, el)) // these are addons on increased quantity
      .filter(el => !findOnFilter(selectedAddons, el));

    // date has changed possibly so I must filter selectedExcludes and
    // selectedAddons because selectedBox.inlcudedProducts and
    // selectedBox.addOnProducts may be different
    selectedExcludes = selectedExcludes.filter(el => findOnFilter(selectedBox.includedProducts, el));
    selectedAddons = selectedAddons.filter(el => findOnFilter(selectedBox.addOnProducts, el));

    /*
     * XXX updated to allow customisation
    if (selectedVariant.requires_selling_plan) {
      editBoxActive = false;
      // no customization allowed
    };
    */

    boxRules = getRules(selectedBox.shopify_product_id, selectedDate);

    // The box has no products
    if (selectedBox.includedProducts.length === 0 &&
      selectedBox.addOnProducts.length === 0) {
      boxIsEmpty = true;
    };
    console.log('box is empty', boxIsEmpty);
  };

  /**
   * Commmitted now to submitting data, show loading
   *
   * @function confirmSubmitCart
   */
  const confirmSubmitCart = async () => {
    document.getElementById("add-button-wrapper").innerHTML = `
  <div class="progress-bar">
    <span class="bar">
      <span class="progress" />
    </span>
  </div>
    `;
    submitCart()
  };

  /**
   * Show popup and get user confirmation to replace box in cart
   *
   * @function initSubmitCart
   */
  const initSubmitCart = async () => {
    if (!loadedFromCart && cartBoxId) {
      showWarningPopup = !showWarningPopup;
      await this.refresh()
      const popup = document.querySelector(`#popup-${productJson.id}`);
      if (popup) {
        popup.animate({ opacity: 1 }, animationOptions);
      }
    } else {
      confirmSubmitCart()
    }
  };

  const popupCallback = (result) => {
    if (result) {
      confirmSubmitCart()
      return;
    }
    showWarningPopup = !showWarningPopup;
    this.refresh()
  };

  /**
   * Helper method
   *
   * @function makeTitle
   */
  const makeTitle = (el) => {
    let title = el.shopify_title;
    if (el.quantity > 1) {
      title = `${title} (${el.quantity})`;
    }
    return title
  };

  /**
   * Helper method to find selling plan for the products being added to the box
   * I.e. the addon items, and extra includes and swaps
   * Uses the jQuery and Shopify objects made available in store
   *
   * @function getSellingPlan
   */
  const getSellingPlan = async (handle, selling_plan_name) => {
    // if operating outside the store, e.g. in npm run start development mode
    // if (typeof jQuery === "undefined" || !window.Shopify) return null;

    if (selling_plan_name) {
      const { json: product } = await Fetch(`/products/${ handle }.js`);
      const selling_plans = product.selling_plan_groups[0].selling_plans;
      const selling_plan = selling_plans.find(el => el.name === selling_plan_name);
      const selling_plan_id = selling_plan ? selling_plan.id : null;
      /*
      await jQuery.getJSON(`${window.Shopify.routes.root}products/${handle}.js`, (product) => {
        console.log(product);
        const selling_plans = product.selling_plan_groups[0].selling_plans;
        const selling_plan = selling_plans.find(el => el.name === selling_plan_name);
        selling_plan_id = selling_plan ? selling_plan.id : null;
      });
      */
      return selling_plan_id;
    };
    return null;
  };

  /**
   * Make up cart data, submit to cart.js and redirect page
   *
   * @function submitCart
   */
  const submitCart = async () => {

    const selling_plans = productJson.selling_plan_groups[0].selling_plans;
    let selling_plan_name = null;
    if (selectedSellingPlanId) {
      selling_plan_name = selling_plans.find(el => el.id === selectedSellingPlanId).name;
    };

    // helper method
    const makeItem = (el, decr, selling_plan) => {
      return {
        id: el.shopify_variant_id,
        quantity: el.quantity - decr,
        selling_plan,
        properties: {
          "Delivery Date": selectedDate,
          "Add on product to": selectedBox.shopify_title,
        },
      }
    };

    // initialize promises
    const promises = [];

    // following that are any addon items - using promises to wait for the fetch
    selectedAddons.forEach((el) => {
      promises.push(getSellingPlan(el.shopify_handle, selling_plan_name)
        .then(selling_plan => makeItem(el, 0, selling_plan))
      );
    });

    // following that are any addon items that are already included in box but are extras
    selectedIncludes.forEach(async (el) => {
      if (el.quantity > 1) {
        promises.push(getSellingPlan(el.shopify_handle, selling_plan_name)
          .then(selling_plan => makeItem(el, 1, selling_plan))
        );
      };
    });

    // following that are any swapped items, first is included, more are added to price
    selectedSwaps.forEach(async (el) => {
      if (el.quantity > 1) {
        promises.push(getSellingPlan(el.shopify_handle, selling_plan_name)
          .then(selling_plan => makeItem(el, 1, selling_plan))
        );
      };
    });

    const items = await Promise.allSettled(promises)
      .then(values => values.map(res => res.value));

    // first cart item is the box itself - which appears to need to be the last??
    items.push({
      quantity: 1,
      id: selectedVariant.id,
      selling_plan: selectedSellingPlanId ? selectedSellingPlanId : null, // null if not selected
      properties: {
        "Delivery Date": selectedDate,
        "Including": selectedIncludes.map(el => makeTitle(el)).join(),
        "Removed Items": selectedExcludes.map(el => el.shopify_title).join(),
        "Swapped Items": selectedSwaps.map(el => makeTitle(el)).join(),
        "Add on Items": selectedAddons.map(el => makeTitle(el)).join(),
      }
    });

    const data = {items};

    const headers = {"Content-Type": "application/json"};
    const {error: clearError, json: clearJson} = await PostFetch({src: "/cart/clear.js", headers});

    if (clearError) {
      console.warn(clearError); // what to do here??
    };

    // add extra items to the cart
    if (data.items.length) {
      const {error, json} = await PostFetch({src: "/cart/add.js", data, headers});
    };

    // redirect to cart
    const url = "/cart";
    window.location = url;

  };

  /**
   * Handle click event on selected elements
   *
   * @function handleClick
   * @param {object} ev The firing event
   * @listens click
   */
  const handleClick = async (ev) => {
    if (ev.target.tagName === "INPUT" || ev.target.tagName === "DIV") {
      if ((ev.target.type === "checkbox" && ev.target.id === "toggleEditBox") || ev.target.id === "toggleInput") {
        editBoxActive = !editBoxActive;
        animateFadeForAction("customize-box", async () => await this.refresh());
      }
    }
    if (ev.target.tagName === "BUTTON") {
      if (ev.target.id === "qtyForm") {
        modalQtyForm= !modalQtyForm;
        await this.refresh(); // render quantity modal

        const overlay = document.querySelector("#containerBoxOverlay");
        overlay.style.visibility = "visible";

        let animation;

        animation = overlay.animate({
          opacity: 0.9,
        }, animationOptions);

        animation = document.querySelector("#quantityModal").animate({
          opacity: 1,
        }, animationOptions);

      };
      if (ev.target.id === "qtyFormClose") {
        modalQtyForm= !modalQtyForm;
        const overlay = document.querySelector("#containerBoxOverlay");
        let animation;
        // hide overlay
        animation = overlay.animate({
          opacity: 0,
        }, animationOptions);

        // hide modal
        animation = document.querySelector("#quantityModal").animate({
          opacity: 0
        }, animationOptions);

        animation.addEventListener("finish", () => {
          overlay.style.visibility = "hidden";
          this.refresh();
        });
      }
    }
  };

  this.addEventListener("click", handleClick);

  /**
   * Select the selling plan for box
   *
   * @function handleSellingPlanSelect
   * @param ev {object} The event object with ev.detail.selling_plan_id to be selected
   * @listens selectSellingPlanEvent
   */
  const handleSellingPlanSelect = (ev) => {
    selectedSellingPlanId = ev.detail.selling_plan_id;

    this.refresh();
    updatePriceElement();

  };

  this.addEventListener("selectSellingPlanEvent", handleSellingPlanSelect);

  /**
   * Select the variant for box
   *
   * @function handleVariantSelect
   * @param ev {object} The event object with ev.detail.variant to be selected
   * @listens selectVariantEvent
   */
  const handleVariantSelect = (ev) => {
    selectedVariant = productJson.variants.find(el => el.id === parseInt(ev.detail.variant));

    // full reset ?? or can we just filter the fetchJson we already have?
    // similar to the first load in init()
    selectedDate = null;
    selectedBox = null;
    // filter dates on the variant day
    const possibleDates = Object.keys(fetchJson)
      .filter(el => selectedVariant.title.substring(0, 2).toLowerCase() === el.substring(0, 2).toLowerCase());

    // may be no dates for the variant
    if (possibleDates.length) {
      fetchDates = possibleDates.map(el => el);
    } else {
      fetchDates = [];
    };

    if (fetchDates.length === 1) {
      selectedDate = fetchDates[0];
      selectedBox = fetchJson[selectedDate];
    };

    if (selectedBox) {
      // XXX test here for box
      loadBox();
      showBoxActive = true;
    };

    animateFadeForAction("container-box", async () => await this.refresh());
    updatePriceElement();
  };
  this.addEventListener("selectVariantEvent", handleVariantSelect);

  /**
   * Select the date for box
   *
   * @function handleDateSelect
   * @param ev {object} The event object with ev.detail.date to be selected
   * @listens selectDateEvent
   */
  const handleDateSelect = (ev) => {
    selectedDate = ev.detail.date;
    selectedBox = fetchJson[selectedDate];

    loadBox();
    showBoxActive = true;

    // repeated routine see moveProduct
    animateFadeForAction("defaultBox", async () => await this.refresh());
    updatePriceElement();
  };
  this.addEventListener("selectDateEvent", handleDateSelect);

  /** 
   * Map strings to the lists
   *
   * @function listMap
   */
  const listMap = (str) => {
    let list;
    switch(str) {
      case 'possibleAddons':
        list = possibleAddons;
        break;
      case 'selectedAddons':
        list = selectedAddons;
        break;
      case 'selectedIncludes':
        list = selectedIncludes;
        break;
      case 'selectedExcludes':
        list = selectedExcludes;
        break;
      case 'selectedSwaps':
        list = selectedSwaps;
        break;
    }
    return list;
  }
  /**
   * Update priceElement on relevant changes
   *
   * @function updatePriceElement
   */
  const updatePriceElement = () => {
    let start = 0;
    selectedIncludes.forEach(el => {
      if (el.quantity > 1) start += el.shopify_price * (el.quantity - 1);
    });
    selectedAddons.forEach(el => {
      start += el.shopify_price * el.quantity;
    });
    selectedSwaps.forEach(el => {
      if (el.quantity > 1) start += el.shopify_price * (el.quantity - 1);
    });

    // price of the addons included
    const addOnsPrice = start > 0 ? `+ ${priceToCurrency(start)}` : "" ;

    let selling_plan;
    let price_adjustment = 0;
    let discount_price;
    if (productJson.selling_plan_groups.length > 0) {
      selling_plan = productJson.selling_plan_groups[0].selling_plans[0];
    };

    if (selectedSellingPlanId) { // allow fail at the moment if no selling plan
      price_adjustment = selling_plan.price_adjustments[0].value;
      discount_price = selectedVariant.selling_plan_allocations[0].per_delivery_price;
    };

    let product_price;
    if (price_adjustment > 0) {
      product_price = discount_price;
    } else {
      product_price = selectedVariant.price;
    }

    // base price of the box
    const basePrice = priceToCurrency(product_price);

    // increment total price of the order
    const totalPrice = priceToCurrency(start + product_price);

    const priceElement = document.querySelector("#product-price");
    animateFadeForAction(priceElement, async () => {
      priceElement.innerHTML = totalPrice;
    });
    // Now allowing customisation for subscriptions so need to update subscription prices too
    const oneTimePriceElement = document.querySelector("#one-time-price");

    // may not have subscriptions
    const subscriptionPriceElement = document.querySelector("#subscription-price");
    if (oneTimePriceElement) {
      animateFadeForAction(oneTimePriceElement, async () => {
        oneTimePriceElement.innerHTML = totalPrice;
      });
    };
    if (subscriptionPriceElement) {
      animateFadeForAction(subscriptionPriceElement, async () => {
        subscriptionPriceElement.innerHTML = totalPrice;
      });
    };

  };

  /**
   * Helper method for moveProduct
   *
   * @function moveItem
   * @param ev {object} The event object with ev.detail
   */
  const moveItem = async ({fromList, toList, id}) => {
    for (let i = 0; i < fromList.length; i++) {
      if (fromList[i].shopify_product_id === id) {
        toList.push(fromList[i]);
        fromList.splice(i, 1);
      }
    }
    toList = sortObjectByKey(toList, 'shopify_title');
  };

  /**
   * Move product between product lists of addon, excludes etc
   * * ev.detail.id - product id
   * * ev.detail.from - moving from this list
   * * ev.detail.to - move to this list
   *
   * Using moveItem to move between lists
   *
   * @function moveProduct
   * @param ev {object} The event object with ev.detail
   * @listens moveProductEvent
   */
  const moveProduct = async (ev) => {
    let fromList = listMap(ev.detail.from);
    let toList = listMap(ev.detail.to);

    // for swaps, if removing from selectedSwaps back to includedProducts, then
    // we must also put back the excludeProduct Biggest worry here is how to
    // identify *which* was swapped out when excludedProducts.length > 1

    const id = parseInt(ev.detail.id, 10);
    moveItem({toList, fromList, id});

    updatePriceElement();

    // if moving from includedProducts to selectedSwap we need to store the swap
    if (ev.detail.from === "possibleAddons" && ev.detail.to === "selectedSwaps") {
      swapMap["selectedSwaps"].push(id);
    };
    if (ev.detail.from === "selectedIncludes" && ev.detail.to === "selectedExcludes") {
      swapMap["selectedIncludes"].push(id);
    };
    if (ev.detail.from === "selectedExcludes" && ev.detail.to === "selectedIncludes") {
      const swapIdx = swapMap["selectedIncludes"].indexOf(id);
      const swappedId = swapMap["selectedSwaps"][swapIdx];
      // restore swapped item first check if the quantity has been incremented
      // if so change the quantity and move to addons
      const swappedItem = selectedSwaps.find(el => el.shopify_product_id === swappedId);
      if (swappedItem && swappedItem.quantity > 1) {
        swappedItem.quantity -= 1;
        selectedSwaps.splice(selectedSwaps.indexOf(swappedItem), 1);
        selectedAddons.push(swappedItem);
        selectedAddons = sortObjectByKey(selectedAddons, 'shopify_title');
      } else {
        // otherwise just remove it
        moveItem({
          fromList: selectedSwaps,
          toList: possibleAddons,
          id: swappedId
        })
      };
      // remove ids from swapMap
      swapMap["selectedSwaps"].splice(swapIdx, 1);
      swapMap["selectedIncludes"].splice(swapIdx, 1);
    };
    if (ev.detail.from === "selectedSwaps" && ev.detail.to === "possibleAddons") {
      const swapIdx = swapMap["selectedSwaps"].indexOf(id);
      const excludedId = swapMap["selectedIncludes"][swapIdx];
      // in this case we don't care about the swappedItem's quantity - the user is removing it
      // restore excluded item
      moveItem({
        fromList: selectedExcludes,
        toList: selectedIncludes,
        id: excludedId
      })
      // remove ids from swapMap
      swapMap["selectedSwaps"].splice(swapIdx, 1);
      swapMap["selectedIncludes"].splice(swapIdx, 1);
    };

    // repeated routine see handleDateSelect
    animateFadeForAction("defaultBox", async () => await this.refresh());

    /* My preference to close up the list on each addition - overruled by Streamside
    if ([ev.detail.from, ev.detail.to].includes("possibleAddons")) {
      animateFadeForAction("productSelector", async () => await this.refresh());
    };

    const appElement = document.querySelector("#app");
    if (appElement) {
      appElement.scrollIntoView();
      window.scrollBy({top: -120});
    };
    */

  };
  this.addEventListener("moveProductEvent", moveProduct);

  /**
   * Quantity changed by quantity form
   * * ev.detail.id - product id
   * * ev.detail.quantity - the value changed
   * * ev.detail.list - the list: either selectedIncludes or selectedAddons
   *
   * @function quantityUpdated
   * @param ev {object} The event object with ev.detail
   * @listens quantityUpdateEvent
   */
  const quantityUpdate = (ev) => {
    const productList = listMap(ev.detail.list);
    let targetList;
    if (ev.detail.list === "selectedIncludes") targetList = "selectedExcludes";
    if (ev.detail.list === "selectedAddons") targetList = "possibleAddons";
    if (ev.detail.list === "selectedSwaps") targetList = "possibleAddons";

    // for swaps, if set to zero we must also move the 'matched' removed item back in includes
    // TODO XXX

    productList.forEach(el => {
      if (el.shopify_product_id === parseInt(ev.detail.id, 10)) {
        if (parseInt(ev.detail.quantity) === 0) {
          el.quantity = 1;
          moveProduct({detail: {id: el.shopify_product_id, from: ev.detail.list, to: targetList}});
        } else {
          el.quantity = ev.detail.quantity;
        }
      }
    });
    updatePriceElement();
    this.refresh();
  };
  this.addEventListener("quantityUpdateEvent", quantityUpdate);

  /**
   * Gather box includes for display, watch for dates, cart items and date
   * already selected from collection
   *
   * @function init
   */
  const init = async () => {
    const baseUrl = getSetting("General", "api-url");
    let fetchUrl = `${baseUrl}current-boxes-by-product/${productJson.id}`;

    if (window.location.search) {
      const selling_plan = findGetParameter("selling_plan");
      if (selling_plan) selectedSellingPlanId = parseFloat(selling_plan);

      const variant = findGetParameter("variant");
      if (variant) selectedVariant = productJson.variants.find(el => el.id === parseFloat(variant));
    };

    if (!selectedVariant) selectedVariant = productJson.variants[0]; // select the first if not in query
      
    await Fetch(fetchUrl).then(async ({ error, json }) => {
      let showBox = false;
      if (error) {
        fetchError = error;
      } else {
        if (Object.keys(json).length > 0) {
          fetchDates = Object.keys(json);

          // only filter if we have more than one variant or the variant describes a weekday
          const variant_title_substring = selectedVariant.title.substring(0, 2).toLowerCase();
          if (productJson.variants.length > 1) {
            fetchDates = fetchDates.filter(el => variant_title_substring === el.substring(0, 2).toLowerCase());
          } else if (weekdays.find(el => variant_title_substring === el.substring(0, 2).toLowerCase())) {
            // a case where only one delivery day variant is described and not 'Default Title'
            fetchDates = fetchDates.filter(el => variant_title_substring === el.substring(0, 2).toLowerCase());
          };

          fetchJson = json;
          if (fetchDates.length === 1) {
            selectedDate = fetchDates[0];
            selectedBox = fetchJson[selectedDate];
            showBox = true;
          };
        };
      };

      // in both the following circumstances we should present entire edit box
      if (cartJson.items.length) {
        // find the selected date from the items
        const cartAddons = {};
        let cartRemovedItems = [];
        let cartSwappedItems = [];
        for (const item of cartJson.items) {
          if (item.product_type === "Container Box") {
            // get the delivery date regardless of which box and use if available
            selectedDate = item.properties["Delivery Date"];

            // XXX do something clever for old carts and mismatched days/variants
            // remembering that selected date is already set
            if (hasOwnProp.call(fetchJson, selectedDate)) selectedBox = fetchJson[selectedDate];

            // can assume same removed items for a different box
            if (hasOwnProp.call(item.properties, "Removed Items")) {
              cartRemovedItems = item.properties["Removed Items"].split(",");
            };
            // can assume same removed items for a different box
            if (hasOwnProp.call(item.properties, "Swapped Items")) {
              // get proper title
              cartSwappedItems = item.properties["Swapped Items"]
                .split(",")
                .map(el => (matchNumberedString(el).str));
            };
            cartBoxId = item.product_id;

            if (item.product_id === productJson.id) {
              // only now are we sure that this is the same box
              loadedFromCart = true;
            };
          };
          if (item.product_type === "Box Produce") {
            // these are included in the box as addons or may be as swapped items with extra quantity
            cartAddons[item.variant_id] = item.quantity;
            // also need to adjust quantity of includedProducts
          };
        };

        if (!selectedBox) {
          selectedDate = null;
        } else {
          // if a mismatch after getting date from cart then use first available box
          if (selectedDate !== selectedBox.delivered) selectedDate = selectedBox.delivered;

          showBox = true;
          // setup selectedAddons and selectedExcludes from the cart - only do this on init
          selectedBox.includedProducts.forEach(el => {
            if (hasOwnProp.call(cartAddons, el.shopify_variant_id)) {
              const item = { ...el };
              item.quantity = 1 + cartAddons[el.shopify_variant_id];
              selectedIncludes.push(item);
              // disallow further use for addons
              delete cartAddons[el.shopify_variant_id];
            };
          });
          selectedBox.addOnProducts.forEach(el => {
            const item = { ...el };
            if (cartSwappedItems.includes(el.shopify_title)) {
              if (hasOwnProp.call(cartAddons, el.shopify_variant_id)) {
                item.quantity = cartAddons[el.shopify_variant_id] + 1; // the other is a swap
                delete cartAddons[el.shopify_variant_id];
              } else {
                item.quantity = 1;
              };
              selectedSwaps.push(item)
            } else {
              if (hasOwnProp.call(cartAddons, el.shopify_variant_id)) {
                item.quantity = cartAddons[el.shopify_variant_id]; // cart is {variant: quantity}
                selectedAddons.push(item);
                delete cartAddons[el.shopify_variant_id];
              };
            };
          });
          selectedExcludes = selectedBox.includedProducts.filter(el => cartRemovedItems.includes(el.shopify_title));
          // and remove swaps from the addOnProducts
          //selectedBox.addOnProducts.sort((a, b) => (a.shopify_title > b.shopify_title) ? 1 : -1)
        };

      };

      //console.log('date', selectedDate);
      //console.log('box', selectedBox);

      /* XXX this was part of the app build for arriving from adding product
       * from an individual box product, e.g. see product-box.js
      if (window.location.search) {
        const ts = findGetParameter("ts");
        if (ts) {
          const d = new Date(parseInt(ts, 10));
          selectedDate = d.toDateString();
          selectedBox = fetchJson[selectedDate];
          showBox = true;
          // no aop without a timestamp
          const aop = findGetParameter("aop");
          if (aop) {
            // got an add on product
            const item = selectedBox.addOnProducts.find(el => el.shopify_product_id === parseInt(aop, 10));
            if (item) {
              const product = { ...item };
              product.quantity = 1;
              selectedAddons.push(product);
            }
          }
        }
        const edit = findGetParameter("edit");
        if (ts || edit) {
          customizingBox = true;
          showBox = true;
        }
      }
      */

      // either a single delivery date, or selected date
      // or box in cart XXX which needs a fix for bad matching dates
      if (showBox) {
        loadBox();
        // this.schedule runs after this.refresh
        this.schedule(() => {
          setTimeout(() => { // helps to keep things smooth on load
            showBoxActive = true;
            editBoxActive = customizingBox;
            this.refresh();
            if (customizingBox) {
              setTimeout(() => { // helps to keep things smooth on load
                editBoxActive = customizingBox;
                this.refresh();
              }, 1500);
            };
            updatePriceElement();
          }, 500);
        });
      }

      loading = false;
      // loaded??
      console.log('Boxes loaded successfully');

    }).catch((e) => {
      console.log('Caught error on loading', e);
    }).finally(() => {
      console.log('Here the finally', loading);
    });
  };

  const getVariants = () => {
    if (productJson.variants.length === 1 &&
      productJson.variants[0].title.toLowerCase() === "default title") return [];
    return productJson.variants.map(el => {
      // map directly as required for SelectMenu
      return {item: `${el.id}`, text: el.title};
    });
  };

  await init();  // set up script

  for await ({ productJson } of this) {
    yield (
      <div id="container-box">
        <div id="containerBoxOverlay" class="overlay"></div>
        {loading ? (
          <BarLoader />
        ) : (
          <Fragment>
            { modalQtyForm && (
              <QuantityForm
                selectedIncludes={selectedIncludes}
                selectedAddons={selectedAddons}
                selectedSwaps={selectedSwaps}
              />
            )}
            <VariantSelector boxVariants={getVariants()} selectedVariant={selectedVariant} />
            <DateSelector fetchDates={fetchDates} selectedDate={selectedDate} />
            { selectedDate && boxRules.length > 0 && (
              <div class="notice"
                  style={{
                    "color": getSetting("Colour", "notice-fg"),
                    "background-color": getSetting("Colour", "notice-bg")
                  }}>
                {boxRules.map(rule => (
                  <p>{rule}</p>
                ))}
              </div>
            )}
            { productJson.selling_plan_groups.length > 0 && selectedBox && (
              <SellingPlans productJson={productJson} selectedVariant={selectedVariant} selectedSellingPlanId={selectedSellingPlanId} />
            )}
            { !boxIsEmpty ? (
              <BoxProducts
                selectedIncludes={selectedIncludes}
                selectedExcludes={selectedExcludes}
                selectedAddons={selectedAddons}
                selectedSwaps={selectedSwaps}
                collapsed={!(showBoxActive && selectedDate)}
                id={`defaultbox`}
              />
            ) : (
              <div class="notice"
                  style={{
                    "color": getSetting("Colour", "notice-fg"),
                    "background-color": getSetting("Colour", "notice-bg")
                  }}>
                No products included in this box, please see description.
              </div>
            )}
            { showBoxActive && selectedDate && !boxIsEmpty && (
              <Fragment>
                <div id="toggleInput" class="pointer flex-row" style="margin-bottom: 1em">
                  <div class="flex-left">
                    <label
                      for="toggleEditBox"
                      htmlFor="toggleEditBox"
                      class="db pointer"
                      style="margin: .5em 0 0 0;"
                    >
                      <input
                        class="checkbox"
                        type="checkbox"
                        id="toggleEditBox"
                        checked={editBoxActive}
                      />
                        {getSetting("Translation", "customize-box")}
                    </label>
                  </div>
                  <div class="flex-right">
                    <div class="button-wrapper">
                      <button
                        title="Change product quantities"
                        id="qtyForm"
                        type="button"
                        style={{
                          color: getSetting("Colour", "button-foreground"),
                          "background-color": getSetting("Colour", "button-background"),
                          "border-color": getSetting("Colour", "button-background"),
                          "font-size": "1em",
                          }}
                        >
                        {getSetting("Translation", "edit-quantities")}
                      </button>
                    </div>
                  </div>
                </div>
              </Fragment>
            )}
            <div id="customize-box">
              <div style={{
                  "display": editBoxActive ? 'block' : 'none',
                }}>
                <ProductSelector
                  selectedIncludes={selectedIncludes}
                  possibleAddons={possibleAddons}
                  selectedExcludes={selectedExcludes}
                />
              </div>
              { showBoxActive && selectedDate && (
                <div class="button-wrapper" id="add-button-wrapper">
                  { cartBoxId && (selectedBox.shopify_product_id !== cartBoxId) && (
                    <div class="notice"
                        style={{
                          "color": getSetting("Colour", "notice-fg"),
                          "background-color": getSetting("Colour", "notice-bg")
                        }}>
                      <p>{getSetting("Translation", "existing-box-warn")}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    name="add"
                    id="add-button"
                    aria-label="Add to cart"
                    data-add-to-cart=""
                    onclick={initSubmitCart}
                    style={{
                      color: getSetting("Colour", "button-foreground"),
                      "background-color": getSetting("Colour", "button-background"),
                      "border-color": getSetting("Colour", "button-background"),
                      }}
                  >
                    <span data-add-to-cart-text="">{ loadedFromCart
                        ?
                        getSetting("Translation", "update-selection")
                        :
                        getSetting("Translation", "add-to-cart")
                    }</span>{" "}
                    <span style="display:none" data-loader="">
                      <svg
                        aria-hidden="true"
                        focusable="false"
                        role="presentation"
                        class="icon icon-spinner"
                        viewbox="0 0 20 20"
                      >
                        <path
                          d="M7.229 1.173a9.25 9.25 0 1 0 11.655 11.412 1.25 1.25 0 1 0-2.4-.698 6.75 6.75 0 1 1-8.506-8.329 1.25 1.25 0 1 0-.75-2.385z"
                          fill="#fad14d"
                        ></path>
                      </svg>
                    </span>
                  </button>
                  { !loadedFromCart && (
                      <Popup
                        class="w-third-ns"
                        id={productJson.id}
                        buttons={true}
                        active={showWarningPopup}
                        callback={popupCallback}
                        text={getSetting("Translation", "existing-box-confirm")} />
                  )}
                </div>
              )}
            </div>
          </Fragment>
        )}
      </div>
    );
  }
}

export default ContainerBoxApp;
