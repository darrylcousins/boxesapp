/**
 * Makes subscription component
 *
 * @module app/recharge/subscription
 * @exports Subscription
 * @requires module:app/recharge/subscription
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import Button from "../lib/button";
import Error from "../lib/error";
import { CloseIcon } from "../lib/icon";
import { PostFetch, Fetch } from "../lib/fetch";
import {
  subscriptionChanged,
  giveNotice,
  loadAnotherSubscription,
  showActionModalEvent,
  requiredActionCallbackEvent,
} from "./events";
import {
  animateFadeForAction,
  animationOptions,
  matchNumberedString,
  toPrice,
  floatToString,
  sortObjectByKey,
} from "../helpers";
import ActionModal from "./action-modal";
import { notifyUser } from "./toast";
import {
  unsubscribedExtrasAction,
  subscribedNotAvailableAction,
  subscribedNotIncludedAction,
  orphanedItemsAction,
  chainStartAction,
} from "./modal-actions";

/**
 * Subscription
 *
 * @function
 * @param {object} props Props
 * @param {object} props.subscription Subscription object
 * @yields Element
 * @example
 * import {renderer} from '@b9g/crank/dom';
 * renderer.render(<Subscription subscription={subscription} />, document.querySelector('#app'))
 */
function *Subscription({ subscription, customer }) {

  /**
   * True while loading data from api
   *
   * @member {boolean} loading
   */
  let boxLoading = true;
  /**
   * A list or required actions to reconcile the subscription with the current box
   * This includes none, one, or all of the following
   *  * subscribedItems not available
   *  * subscribedItems (available) but not included as extras (beware Includes)
   *  * extra items that are not subscribed to - only can happen with manual update of line properties
   *  * orphanedItems included in boxProperty lists but not in the box includes nor addons
   *
   *  The idea here is to force a modal letting them know what is required <continue>
   *  Pop next action off list, force a modal, on select of action <confirm>
   *  Until all are done.
   *
   * @member {object} requiredActions
   */
  let chainRequiredActions = [];
  /**
   * The properties as read from subscription properties
   *
   * @member {object} boxProperties
   */
  let boxProperties = null;
  /**
   * The properties including box product objects and quantities
   *
   * @member {object} boxLists
   */
  let boxLists = null;
  /**
   * The loaded box matching delivered and product_id
   *
   * @member {object|string} fetchBox
   */
  let fetchBox = null;
  /**
   * The loaded subscriptions from api matching extra products
   *
   * @member {object|string} includedSubscriptions
   */
  let includedSubscriptions = [];
  /**
   * If fetch returns an error
   *
   * @member {object|string} fetchError
   */
  let fetchError = null;
  /**
   * If fetching brings about a warning message
   *
   * @member {object|string} fetchMessages
   */
  let fetchMessages = [];
  /**
   * The subscription price, update locally so we don't need to reload
   * subscription if changes are cancelled
   *
   * @member {object|string} subscriptionBoxPrice
   */
  let subscriptionBoxPrice = subscription.price;
  /**
   * True if requiring user input for actions pertaining to fixing list from subscriptions
   *
   * @member {boolean} showActionModal
   */
  let showActionModal = false;
  /**
   * The options for confirmation/select modal
   *
   * @member {object|string} actionModalOptions
   */
  let actionModalOptions = {
    modalChildren: null,
    hideModal: null,
  };
  /**
   * Clear actionModalOptions
   *
   * @function clearActionModalOptions
   */
  const clearActionModalOptions = () => {
    const stored = { ...actionModalOptions };
    for (const key of Object.keys(stored)) {
      actionModalOptions[key] = null;
    };
  };

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
      if (products !== null) {
        products
          .split(',')
          .map(el => el.trim())
          .map(el => matchNumberedString(el))
          .forEach(el => {
            if (name === "Including" && el.count > 1) {
              start.push({name: el.str, count: el.count - 1});
            } else if (name === "Swapped Items" && el.count > 1) {
              start.push({name: el.str, count: el.count - 1});
            } else if (name === "Add on Items") {
              start.push({name: el.str, count: el.count});
            };
        });
      };
    });
    start = sortObjectByKey(start, "name");
    return start;
  };

  /**
   * Hide the actions modal and cancel the transaction
   *
   * @function hideModal
   * @param {object} ev Event emitted
   * @listens window.keyup
   */
  const hideActionModal = (ev) => {
    console.log(ev.target); // may be svg or path
    //if ((ev.target && ev.target.tagName === "BUTTON") || (ev.key && ev.key === "Escape")) {
    if (ev.target || (ev.key && ev.key === "Escape")) {
      showActionModal = false;
      clearActionModalOptions();
      this.refresh();
    }
  };
  // shouldn't be able to dismiss this modal
  // window.addEventListener("keyup", hideActionModal);

  /**
   * Submit all changes made
   *
   * @function submitChanges
   * @param {object} data The data to send
   */
  const submitChanges = async (data) => {
    const headers = { "Content-Type": "application/json" };
    const { error, json } = await PostFetch({
      src: "/api/recharge-subscription-update",
      data,
      headers,
    })
      .then((result) => result)
      .catch((e) => ({
        error: e,
        json: null,
      }));
    if (!error) {
      return json;
    };
    return error;
  };

  /**
   * Save all changes made
   *
   * @function saveChanges
   */
  const saveChanges = async () => {
    const target = document.querySelector(`#subscription-${subscription.id}`);
    const data = { properties: [
      { name: "Delivery Date", value: boxProperties["Delivery Date"] }
    ] };
    let str = '';
    for (const [name, list] of Object.entries(boxLists)) {
      if (name !== "possibleAddons") {
        str = list.map(el => `${el.shopify_title}${ el.quantity > 1 ? ` (${el.quantity})` : "" }`)
          .filter(el => Boolean(el)).join(',');
        data.properties.push({
          name,
          value: str
        });
      };
    };
    for (const name of ["Likes", "Dislikes"]) {
      data.properties.push({
        name,
        value: boxProperties[name],
      });
    }
    data.price = floatToString(subscriptionBoxPrice * 100);
    data.id = subscription.id;
    animateFadeForAction(target, async () => {
  
      const result = await submitChanges(data);
      const el = document.querySelector("#saveMessage");
      el.animate({ top: "-45px" }, animationOptions);
      if (Object.hasOwnProperty.call(result, "subscription")) {
        const notice = `Saved changes and updated subscription`;
        this.dispatchEvent(giveNotice({
          notice,
          bgColour: "black",
          borderColour: "black"
        }));
      } else {
        const notice = `Update failed`;
        this.dispatchEvent(giveNotice({
          notice,
          bgColour: "red",
          borderColour: "dark-red"
        }));
      };
    });
  };

  /**
   * Fetch included subscriptions to individual products
   * Called early so as to update boxLists if necessary
   * Pulls subscriptions matching customer_id and next_charge date
   * Includes the box itself so could just filter that out?? And then rewrite
   * lists to match because if it has been updated manually then the string
   * lists will not match
   *
   * @function getIncludedSubscriptions
   *
   * XXX this is now done differently webhooks/recharge/charge-upcoming
   */
  const getIncludedSubscriptions = async () => {
    const uri = `/api/recharge-subscriptions/${
      subscription.customer_id
    }/${
      subscription.next_charge_scheduled_at
    }/${
      subscription.address_id
    }/${
      //fetchBox.shopify_product_id
      subscription.id
    }`;
    return Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          this.refresh();
          return null;
        };
        includedSubscriptions = json;
      })
      .catch((err) => {
        fetchError = err;
        this.refresh();
      });
  };

  /**
   * Update boxLists once box is loaded to include all product data
   * Initially the boxLists are simple strings taken from the subscription properties
   *  boxLists = { ...boxProperties };
   *  i.e Beetroot (2),Celeriac ... etc
   * Performed on load or cancelling actions
   * After this they are then arrays of objects: shopify_title, id, quantity etc
   *
   * @member {object|string} updateBoxLists
   */
  const updateBoxLists = async () => {
    // make available and then remove if already an addon or swap
    let orphanedItems = [];
    const possibleAddons = [ ...fetchBox.addOnProducts ];
    const setOfLikes = (typeof boxProperties["Likes"] === "string") // can be null when first created
      ? new Set(boxProperties["Likes"].split(",").map(el => el.trim()))
      : new Set();
    const setOfDislikes = (typeof boxProperties["Dislikes"] === "string") // can be null when first created
      ? new Set(boxProperties["Dislikes"].split(",").map(el => el.trim()))
      : new Set();
    Object.entries(boxLists).forEach(([name, str]) => {
      if (str === null) {
        boxLists[name] = [];
      } else {
        let products = str.split(",").map(el => el.trim()).map(el => matchNumberedString(el));
        products = products.map(el => { 
          let product = fetchBox.includedProducts.find(item => item.shopify_title === el.str);
          if (!product) {
            product = fetchBox.addOnProducts.find(item => item.shopify_title === el.str);
            if (product) {
              const idx = possibleAddons.indexOf(product);
              possibleAddons.splice(idx, 1);
            } else {
              // really need to find product_id
              orphanedItems.push({list: name, ...el}); // in boxLists but not available in box
            };
          };
          // may as well update Likes and Dislikes
          if (["Swapped Items", "Add on Items"].includes(name)) setOfLikes.add(el.str);
          if (name === "Removed Items") setOfDislikes.add(el.str);
          if (!product) return null;
          return { ...product, quantity: el.count };
        });
        boxLists[name] = products.filter(el => Boolean(el)); // remove those that returned null
      };
    });
    // filtered from addOnProducts, renamed here to possibleAddons quantity helps later
    boxLists["possibleAddons"] = possibleAddons.map(el => ({ ...el, quantity: 1 }))

    return orphanedItems;
  };

  /**
   * Map lists and collect prices to add to pricedItems
   *
   * @function checkSubscriptions
   * @return {array} requiredActions Array of functions to be called before rendering
   */
  const checkSubscriptions = async (orphanedItems) => {
    // check against the includedSubscriptions
    // using title because all our lists are product title strings

    // boxListExtras are all extra items that should be in the subscription package
    // i.e. should be subscriptions themselves, only if count is more than actual includes
    // note that if unavailable will also not show up here

    // helper method
    const makeEl = (el, qty) => {
      return {
        str: el.shopify_title,
        count: qty,
        shopify_product_id: el.shopify_product_id,
        shopify_price: el.shopify_price
      };
    };
    const boxListExtras = [
      ...boxLists["Including"].filter(el => el.quantity > 1).map(el => makeEl(el, el.quantity - 1)),
      ...boxLists["Swapped Items"].filter(el => el.quantity > 1).map(el => makeEl(el, el.quantity - 1)),
      ...boxLists["Add on Items"].map(el => makeEl(el, el.quantity)),
    ];

    const setOfLikes = (typeof boxProperties["Likes"] === "string") // can be null when first created
      ? new Set(boxProperties["Likes"].split(",").map(el => el.trim()))
      : new Set();
    const setOfDislikes = (typeof boxProperties["Dislikes"] === "string") // can be null when first created
      ? new Set(boxProperties["Dislikes"].split(",").map(el => el.trim()))
      : new Set();

    // subscribedExtras are subscribed items in the package - should also be in boxListExtras
    const subscribedExtras = includedSubscriptions.map(el => ({
      shopify_product_id: el.external_product_id.ecommerce,
      str: el.title, 
      count: el.quantity
    })).filter(el => parseInt(el.shopify_product_id) !== fetchBox.shopify_product_id);
    console.log(fetchBox.shopify_product_id);
    // and also in Likes
    for (const el of subscribedExtras) setOfLikes.add(el.str);
    // use to update boxProperties
    boxProperties["Likes"] = Array.from(setOfLikes).join(",");
    boxProperties["Dislikes"] = Array.from(setOfDislikes).join(",");

    // availableProducts are all current items available in the box matching delivery date
    const availableProducts = [
      ...fetchBox.addOnProducts.map(el => el.shopify_title),
      ...fetchBox.includedProducts.map(el => el.shopify_title),
    ];

    const actionProps = {
      parent: this,
      subscription,
      availableProducts,
      boxLists,
      includedSubscriptions,
      fetchBox,
    };
    const requiredActions = []; // result returned from this function
    let subscribedNotAvailable = [];
    let subscribedNotIncluded = [];
    let unsubscribedExtras = [];

    // 2. subscribed extras that are not available at all this could only
    // happen if line properties were changed
    const union = new Set([ ...subscribedExtras, ...availableProducts ]);
    if (union.size !== new Set(availableProducts).size) {
      // fetchMessages.push("Mismatch in subscribed extras and those actually available for this delivery");
      subscribedNotAvailable = new Set(subscribedExtras.map(el => el.str).filter(el => !new Set(availableProducts).has(el)));
      subscribedNotAvailable = subscribedExtras.filter(el => subscribedNotAvailable.has(el.str));
    };

    // 1. subscribed extras and boxListExtras should be the same, could happen that a
    // product subscription removed (unsubscribedExtras) - remove from lists? or add subscription?
    // product was added as a subscription (subscribedNotIncluded) - add to lists if available or pause?
    unsubscribedExtras = new Set(boxListExtras.map(el => el.str).filter(el => !new Set(subscribedExtras.map(el => el.str)).has(el)));
    subscribedNotIncluded = new Set(subscribedExtras.map(el => el.str).filter(el => !new Set(boxListExtras.map(el => el.str)).has(el)));

    // can get a double up here because when not available
    // (subscribedNotIncluded) may also be in unsubscribedExtras because not in
    // boxListExtras so filter again
    unsubscribedExtras = boxListExtras.filter(el => unsubscribedExtras.has(el.str));
    subscribedNotIncluded = subscribedExtras.filter(el => subscribedNotIncluded.has(el.str));
    // filter against the unavailable products - subscribedNotAvailable above
    subscribedNotIncluded = subscribedNotIncluded.filter(el => !new Set(subscribedNotAvailable.map(el => el.str)).has(el.str));

    if (subscribedNotAvailable.length) {
      requiredActions.push(() => subscribedNotAvailableAction({ ...actionProps, items: subscribedNotAvailable}))
    };
    if (subscribedNotIncluded.length) {
      requiredActions.push(() => subscribedNotIncludedAction({ ...actionProps, items: subscribedNotIncluded}))
    };
    if (unsubscribedExtras.length) {
      requiredActions.push(() => unsubscribedExtrasAction({ ...actionProps, items: unsubscribedExtras}))
    };
    if (orphanedItems.length) {
      requiredActions.push(() => orphanedItemsAction({ ...actionProps, items: orphanedItems}))
    };
    if (requiredActions.length) {
      requiredActions.unshift(() => chainStartAction({ ...actionProps }));
    };

    console.log(subscribedNotAvailable);
    console.log(subscribedNotIncluded);
    console.log(unsubscribedExtras);
    console.log(orphanedItems);
 
    return requiredActions;

    // XXX USE THE ALGORITHM DEVELOPED FOR webhooks/recharge/charge-upcoming

  };

  /**
   * Cancel all changes made
   *
   * @function cancelChanges
   */
  const cancelChanges = async () => {
    // fetchBox hasn't changed but we need to reset pricedItems and boxLists
    subscriptionBoxPrice = subscription.price;
    
    boxLists = { ...boxProperties };
    delete boxLists["Delivery Date"];
    delete boxLists["Likes"];
    delete boxLists["Dislikes"];
    delete boxLists["box_subscription_id"];

    pricedItems = await collectCounts();
    await collectPrices();
    await updateBoxLists();
    // boxProperties likes and dislikes may have been changed, reset these last
    boxProperties["Likes"] = boxLists["Swapped Items"].map(el => el.shopify_title).join(",");
    boxProperties["Dislikes"] = boxLists["Removed Items"].map(el => el.shopify_title).join(",");

    this.refresh();

    const el = document.querySelector("#saveMessage");
    el.animate({ top: "-45px" }, animationOptions);
    const notice = `Changes cancelled`;
    this.dispatchEvent(giveNotice({
      notice,
      bgColour: "black",
      borderColour: "black"
    }));
  };

  /**
   * Show action modal
   *
   * @function showActionModal
   * @listens showActionModalEvent
   */
  const renderActionModal = async (ev) => {
    actionModalOptions = { ...ev.detail, hideModal: hideActionModal };
    console.log(actionModalOptions);
    showActionModal = true;
    this.refresh();
  };

  this.addEventListener("showActionModalEvent", renderActionModal);

  /**
   * Move message div into view
   *
   * @function hasChanged
   * @listens subscriptionChanged
   */
  const hasChanged = async () => {
    const el = document.querySelector("#saveMessage");
    el.animate({ top: "52px" }, animationOptions);
  };

  this.addEventListener("subscriptionChanged", hasChanged);

  /**
   * Return to subscription search
   *
   * @function getNewSubscription
   */
  const getNewSubscription = () => {
    this.dispatchEvent(loadAnotherSubscription());
  };

  /**
   * Fetch box data
   *
   * @function getBox
   */
  const getBox = async () => {
    const product_id = subscription.external_product_id.ecommerce;
    const timestamp = new Date(Date.parse(boxProperties["Delivery Date"])).getTime();
    const uri = `/api/box-by-date-and-product/${product_id}/${timestamp}`;
    await Fetch(uri)
      .then(async (result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          boxLoading = false;
          this.refresh();
        } else {
          // XXX do something if no box is found
          // XXX this may be when a user is looking at their subscription prior
          // to the next box being created
          fetchBox = json;
          fetchBox.shopify_price = await getBoxPrice();
          await getIncludedSubscriptions();
          await collectPrices();
          boxLoading = false;
          const content = document.getElementById(`subscription-${subscription.id}`);
          if (content) {
            //for (const target of content.querySelectorAll(".pricing")) {
            animateFadeForAction(content, async () => {
              await this.refresh();
            });
            //};
          } else {
            await this.refresh();
          };
        }
      })
      .catch((err) => {
        fetchError = err;
        boxLoading = false;
        this.refresh();
      });
  };

  /**
   * Chained action callback
   * Report the result and shift off next action in chainRequiredActions
   *
   * @function chainRequiredActionCallback
   */
  const chainRequiredActionCallback = async (ev) => {
    const options = ev.detail;
    console.log(options);
    showActionModal = false;
    clearActionModalOptions();
    await this.refresh();
    if (chainRequiredActions.length) {
      const nextAction = chainRequiredActions.shift();
      console.log("Calling next action");
      nextAction();
    };
  };

  this.addEventListener("requiredActionCallbackEvent", chainRequiredActionCallback);

  /**
   * Initialize data
   *
   * @function init
   */
  const init = async () => {
    /**
     * Collect properties
     *
     * @member {object|string} boxProperties
     */
    boxProperties = subscription.properties.reduce(
      (acc, curr) => Object.assign(acc, { [`${curr.name}`]: curr.value }),
      {});

    boxLists = { ...boxProperties };
    delete boxLists["Delivery Date"];
    delete boxLists["Likes"];
    delete boxLists["Dislikes"];
    delete boxLists["box_subscription_id"];

    /**
     * The priced items, i.e. from addons, extra includes, and swaps
     * At this point only the counts, add prices once fetchBox is loaded
     *
     * @member {object|string} pricedItems
     */
    pricedItems = collectCounts(); // at this point only the count
    //await getCustomer();
    await getBox();
    const orphanedItems = await updateBoxLists();
    chainRequiredActions = await checkSubscriptions(orphanedItems);
    console.log(chainRequiredActions);
    if (chainRequiredActions.length) {
      const nextAction = chainRequiredActions.shift();
      console.log("Calling first action");
      nextAction();
    };
  };

  init();

  for ({ subscription } of this) { // eslint-disable-line no-unused-vars
    yield (
      <Fragment>
        { showActionModal && (
          <ActionModal
            { ...actionModalOptions }
          />
        )}
        <div id="saveMessage"
          style="top: -200px; left: 0px;background-color:rgba(51, 51, 51, 0.9);"
          class="absolute w-100 dt pa2 white z-999">
          <div class="dtc pl4 bold">
            Unsaved changes
          </div>
          <div class="dtc w-20 tr">
            <div class="dib pr2">
              <Button
                onclick={ cancelChanges }
                type="transparent/dark">
                Cancel
              </Button>
            </div>
            <div class="dib pr2">
              <Button
                onclick={ saveChanges }
                hover="dim"
                border="dark-blue"
                type="primary">
                Save
              </Button>
            </div>
          </div>
        </div>
        { fetchError && <Error msg={fetchError} /> }
        { fetchMessages.length > 0 && (
          <div class="dark-blue ma2 br3 ba b--dark-blue bg-washed-blue">
            <div class="tc">
              <ul class="list">
                { fetchMessages.map(el => <li>{el}</li>) }
              </ul>
            </div>
          </div>
        )}
        <div id={ `subscription-${subscription.id}` } class="mt2 relative">
          <div class="flex w-100">
            <div class="w-50">
              <div class="b">
                { subscription.product_title } - { subscription.variant_title }
              </div>
              <div class="dt w-100 mh2">
                <div class="dt-row">
                  <div class="dtc w-50 gray tr pr3 pv1">
                    Box Price:
                  </div>
                  <div class="dtc w-50 pv1">
                    { toPrice(subscriptionBoxPrice * 100) }
                  </div>
                </div>
                <div class="dt-row">
                  <div class="dtc w-50 gray tr pr3 pv1">
                    Total Price:
                  </div>
                  <div class="dtc w-50 pv1">
                    { boxLoading ? (
                      <div class="skeleton mr1" />
                    ) : (
                      <span>{ toPrice(totalPrice()) }</span>
                    )}
                  </div>
                </div>
                <div class="dt-row pv1">
                  <div class="dtc w-50 gray tr pr3 pv1">
                    Next charge scheduled:
                  </div>
                  <div class="dtc w-50 pv1">
                    { new Date(Date.parse(subscription.next_charge_scheduled_at)).toDateString() }
                  </div>
                </div>
                <div class="dt-row pv1">
                  <div class="dtc w-50 gray tr pr3 pv1">
                    Next delivery date:
                  </div>
                  <div class="dtc w-50 pv1">
                    { boxProperties["Delivery Date"] }
                  </div>
                </div>
                <div class="dt-row pv1">
                  <div class="dtc w-50 gray tr pr3 pv1">
                    Customer:
                  </div>
                  <div class="dtc w-50 pv1">
                    <div>
                      { customer && `${customer.first_name} ${customer.last_name}` }
                    </div>
                  </div>
                </div>
                <div class="dt-row pv1">
                  <div class="dtc w-50 gray tr pr3 pv1">
                    Likes:
                  </div>
                  <div class="dtc w-50 pv1">
                    { (boxProperties["Likes"] && boxProperties["Likes"].length > 0) ? (
                      <ul class="list pa0 ma0">
                        { boxProperties["Likes"].split(",").filter(el => el.trim()).map(el => (
                          <li>{ el }</li> 
                        ))}
                      </ul>
                    ) : (
                      <span>None</span>
                    )}
                  </div>
                </div>
                <div class="dt-row pv1">
                  <div class="dtc w-50 gray tr pr3 pv1">
                    Dislikes:
                  </div>
                  <div class="dtc w-50 pv1">
                    { (boxProperties["Dislikes"] && boxProperties["Dislikes"].length > 0) ? (
                      <ul class="list pa0 ma0">
                        { boxProperties["Dislikes"].split(",").filter(el => el.trim()).map(el => (
                          <li>{ el }</li> 
                        ))}
                      </ul>
                    ) : (
                      <span>None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div class="w-50">
              <div class="ml2 mb1">
                <div 
                  class="link bold pointer purple" 
                  onclick={ getNewSubscription }>
                  Load another subscription
                </div>
              </div>
              <div class="ml2 mb1">
                <a 
                  class="link bold purple" 
                  target="_blank"
                  href={`https://${localStorage.getItem("recharge")}.admin.rechargeapps.com/merchant/subscriptions/${subscription.id}/details`}>
                  View subscription in Recharge
                </a>
              </div>
              <div class="ml2 mb1">
                <a 
                  class="link bold purple" 
                  href={`/boxes/${ new Date(Date.parse(boxProperties["Delivery Date"])).getTime() }`}>
                  View box in Boxes
                </a>
              </div>
              <div class="ml2 mb1">
                <div class="customer">
                  <div>
                    <a 
                      class="link bold purple" 
                      target="_blank"
                      href={`https://${localStorage.getItem("shop")}.myshopify.com/admin/customers/${customer.external_customer_id.ecommerce}`}>
                      View customer in Shopify
                    </a>
                  </div>
                </div>
              </div>
              <div id="pricedItems" class="mr2 mt3">
                <div class="ml2 mb1 pt1 w-100 flex bt">
                  <div class="w-80 bold">{ subscription.product_title }</div>
                  <div class="pricing w-20 tr">
                    { boxLoading ? (
                      <div class="skeleton" />
                    ) : (
                      <span>{ toPrice(fetchBox.shopify_price * 100) }</span>
                    )}
                  </div>
                </div>
                { pricedItems.map(el => (
                  <div class="ml2 mb1 w-100 flex">
                    <div class="w-40">{ el.name }</div>
                    <div class="pricing w-20 tr">
                      { boxLoading ? (
                        <div class="skeleton" />
                      ) : (
                        <span>{ toPrice(el.price) }</span>
                      )}
                    </div>
                    <div class="w-20 tc">({ el.count })</div>
                    <div class="pricing w-20 tr">
                      { boxLoading ? (
                        <div class="skeleton" />
                      ) : (
                        <span>{ toPrice(el.count * el.price) }</span>
                      )}
                    </div>
                  </div>
                ))}
                <div class="ml2 mb1 pt1 w-100 flex bt">
                  <div class="w-80 bold">Total</div>
                  <div class="pricing w-20 tr bold">
                    { boxLoading ? (
                      <div class="skeleton" />
                    ) : (
                      <span>{ toPrice(totalPrice()) }</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div id="boxLists" class="flex w-100 mt1 pt2">
            { Object.keys(boxLists).map((name, idx) => (
              name !== "possibleAddons" && (
              <div class={`w-25 bold pt1 dt br bt b--silver ${idx === 0 && "bl"}`}>
                <div class="dtc pl1">
                  { name } <span class="fw3">{ name === "Removed Items" && "(2 only allowed)" }</span>
                </div>
                { name === "Add on Items" && (
                  <div class="dtc tr hover-dark-blue pointer w-10"
                    onclick={() => addProduct({to_list_name: name})}
                    title={`Add item to ${name}`}>
                    <span class="v-mid">
                      <span class="dtc fa fa-plus pr2" />
                    </span>
                  </div>
                )}
              </div>
            )))}
          </div>
          <div class="flex flex-wrap w-100">
            { Object.entries(boxLists).map(([name, value], index) => (
              name !== "possibleAddons" && (
              <div class={`w-25 br bb b--silver ${index === 0 && "bl"}`}>
                { (value && value.length > 0) ? (
                  <ul class="list pl0 mv1">
                    { (boxLoading && typeof value === "string") ? (
                      value.split(",").map(() => (
                        <li class="mt1 pl1 pt1 bt b--silver">
                          <div class="skeleton mr1" />
                        </li>
                      ))
                    ) : (
                      Array.isArray(value) && (
                        value.map((product, idx) => (
                          <li class="mt1 pl1 pt1 bt b--silver">
                            <div class="dt w-100">
                              <div class="dtc w-80">
                                { product.shopify_title } { product.quantity > 1 && `(${ product.quantity })` }
                              </div>
                              <div class="dtc w-10">
                                { name === "Removed Items" ? (
                                  <div class="di w-100">&nbsp;</div>
                                ) : (
                                  <QuantityInput el={ product } id={ name } idx={ idx } />
                                )}
                              </div>
                              { name === "Including" && boxLists["Swapped Items"] && boxLists["Swapped Items"].length >= 2 ? (
                                <div class="dtc w-10">&nbsp;</div>
                              ) : (
                                <div class="dtc w-10 tr pr1 hover-dark-red pointer"
                                  onclick={() => removeProduct({shopify_product_id: product.shopify_product_id, from_list_name: name})}
                                  role="button"
                                  title={`Remove ${product.shopify_title} from ${name}`}>
                                  <span class="v-mid">
                                    <CloseIcon styleSize="1.35em" />
                                  </span>
                                </div>
                              )}
                            </div>
                          </li>
                        ))
                      )
                    )}
                  </ul>
                ) : (
                  <div class="mt1 pt1 pl1 bt b--silver">None</div>
                )}
              </div>
            )))}
          </div>
        </div>
      </Fragment>
    )
  };
};

export default Subscription;
