/**
 * Makes subscription component
 *
 * @module app/recharge/subscription
 * @exports Subscription
 * @requires module:app/recharge/subscription
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal } from "@b9g/crank";
import CollapseWrapper from "../lib/collapse-animator";
import EditProducts from "../products/edit-products";
import Cancelled from "./cancelled";
import ModalTemplate from "../lib/modal-template";
import Error from "../lib/error";
import Help from "../lib/help";
import Toaster from "../lib/toaster";
import { toastEvent } from "../lib/events";
import { PostFetch, Fetch } from "../lib/fetch";
import BarLoader from "../lib/bar-loader";
import ProgressLoader from "../lib/progress-loader";
import Button from "../lib/button";
import TextButton from "../lib/text-button";
import EditBoxModal from "./edit-box-modal";
import SkipChargeModal from "./skip-modal";
import UnSkipChargeModal from "./unskip-modal";
import LogsModal from "../log/logs-modal";
import CancelSubscriptionModal from "./cancel-modal";
import { getSessionId } from "../socket";
import {
  completedActions,
  animateFadeForAction,
  animateFade,
  animationOptions,
  collapseElement,
  transitionElementHeight,
  formatCount,
  LABELKEYS,
  userNavigator,
  dateStringNow,
  floatToString,
  findTimeTaken,
  matchNumberedString,
  sleepUntil,
  displayMessages,
  delay,
} from "../helpers";

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
async function *Subscription({ subscription, customer, idx, admin, brokenSubscriptions, completedAction }) {

  console.log(subscription);
  /*
  console.log("TITLE", subscription.attributes.title);
  console.log("Box", subscription.box);
  console.log("Address", subscription.address);
  console.log("Messages", subscription.messages);
  console.log("Properties", subscription.properties);
  console.log("Updates", subscription.updates);
  console.log(JSON.stringify(
    subscription.attributes.rc_subscription_ids.map(el => {
      return [ el.subscription_id, el.shopify_product_id, el.quantity ].sort();
    }).sort()
    ,null, 2));
  console.log("Ids", JSON.stringify(subscription.attributes.rc_subscription_ids, null, 2));
  console.log("RC_IDS", JSON.stringify(subscription.attributes.rc_subscription_ids, null, 2));
  console.log("Includes", subscription.includes);
  console.log("Attributes", subscription.attributes);
  */

  let CollapsibleProducts = CollapseWrapper(EditProducts);
  /**
   * Simple hold on to the original list as copies of the objects in the list
   * These are { quantity, subscription_id, shopify_product_id }
   *
   * @member {array} rc_subscription_ids_orig
   */
  let rc_subscription_ids_orig = subscription.attributes.rc_subscription_ids.map(el => { return {...el}; });
  /**
   * Simple hold on to the original list as copies of the objects in the list
   * These are { quantity, subscription_id, shopify_product_id }
   * the box subscription will be picked up when rc_subscription_ids change but NOT when making a single swap
   * so we need to hang on to the original so as to identify a change
   *
   * @member {array} subscriptionSwaps_orig
   */
  const subscriptionSwaps_orig = {
    "Removed Items": `${subscription.properties["Removed Items"]}`,
    "Swapped Items":`${subscription.properties["Swapped Items"]}`,
  };
  /**
   * Is the explainer open?
   *
   * @member {boolean} isExplainerOpen
   */
  let isExplainerOpen = false;
  /**
   * Name of messaging div
   *
   * @member {boolean} messageDivId
   */
  let messageDivId = `socketMessages-${subscription.attributes.subscription_id}`;
  /**
   * Hold changed items only used when toggling products, previously was using
   * this to find updates
   *
   * @member {array} changed
   */
  let changed = [];
  /**
   * Hold collapsed state of product edit business
   *
   * @member {boolean} collapsed
   */
  let collapsed = true;
  /**
   * True while loading data from api
   * Starts false until search term submitted
   *
   * @member {boolean} loading
   */
  let loading = false;
  /**
   * The fetch error if any
   *
   * @member {object|string} fetchError
   */
  let fetchError = null;
  /**
   * A save has been done so don't allow edits
   *
   * @member {object|string} editsPending
   */
  let editsPending = Boolean(subscription.attributes.pending);
  /**
   * timer
   *
   * @member {object} Keeping a track of how long updated take
   */
  let timer = null;
  /**
   * loadingSession
   *
   * @member {object} Keeping a track of the session_id
   */
  let loadingSession = null;

  /**
   * Helper method called on load to find problems that will prevent any further changes to box
   *
   * @function hasDuplicates
   */
  const hasDuplicates = () => {
    const id_array = subscription.attributes.rc_subscription_ids.map(el => el.title);
    let title;
    const check = id_array.some((el, idx) => {
      const t = id_array.indexOf(el) != idx;
      if (t) title = el;
      return t;
    });
    return title;
  };

  /**
   * Helper method to pick up messages from other components
   *
   * @function makeTitle
   */
  const collectMessages = async (ev) => {
    // default sleep is for 10 seconds - pass a value if needed
    console.log("collect messages", ev.detail);
    await sleepUntil(() => document.getElementById(`displayMessages-${subscription.attributes.subscription_id}`), 3000)
      .then((res) => {
        displayMessages(res, ev.detail.messages);
      }).catch((e) => {
        // no need for action
        console.log("found no div", e);
      });
  };

  this.addEventListener("subscription.messages", collectMessages);

  /**
   * Helper method to build properties on box
   *
   * @function makeTitle
   */
  const makeTitle = (el) => {
    const { title, quantity } = el;
    if (el.quantity > 1) {
      return `${title} (${el.quantity})`;
    };
    return title
  };

  // helper method - does as above but to the whole list as one
  const makeItemString = (list, join) => {
    if (list.length === 0) return "";
    return list.map(el => {
      return `${el.shopify_title}${el.quantity > 1 ? ` (${el.quantity})` : ""}`;
    }).sort().join(join);
  };

  /*
   * Control the collapse of product list
   * @function toggleCollapse
   */
  const toggleCollapse = async () => {
    collapsed = !collapsed;
    await this.refresh();
    setTimeout(() => {
      if (!collapsed) {
        this.dispatchEvent(
          new CustomEvent("customer.disableevents", {
            bubbles: true,
            detail: { subscription_id: subscription.attributes.subscription_id },
          })
        );
      } else {
        this.dispatchEvent(
          new CustomEvent("customer.enableevents", {
            bubbles: true,
            detail: { subscription_id: subscription.attributes.subscription_id },
          })
        );
      };
    }, 500);
  };

  /*
   * @function saveChanges
   *
   * Initiates the socket and calls doChanges
   */
  const saveChanges = async (key, ev) => {
    ev.target.blur(); // removes the key event listener from the button
    editsPending = true; // setting this when socket is closed
    CollapsibleProducts = CollapseWrapper(EditProducts);
    this.dispatchEvent(
      new CustomEvent("customer.disableevents", {
        bubbles: true,
        detail: { subscription_id: subscription.attributes.subscription_id },
      })
    );
    await this.refresh();
    delay(1000);
    try {
      document.getElementById(`products-${subscription.attributes.subscription_id}-${idx}`).classList.add("disableevents");
      document.getElementById(`buttons-${subscription.attributes.subscription_id}-${idx}`).classList.add("disableevents");
      document.getElementById(`saveMessages-${subscription.attributes.subscription_id }`).classList.remove("dn");
    } catch(e) {
      // should never fail
      console.warn(e);
    };
    await doChanges({ key });
  };

  /*
   * @function titlesOnly
   * 
   * Helper function
   */
  const titlesOnly = (str) => {
    return str
      .split(',')
      .map(el => el.trim())
      .filter(el => el !== "")
      .map(el => matchNumberedString(el))
      .map(el => el.title)
      .join(",");
  };

  /*
   * @function getChangeMessages
   * 
   * Gather list of messages detailing the changes made to the box
   * This will be included in the email to customer
   * e.g. Carrots quantity incresed to 2, Beetroot deleted etc
   */
  const getChangeMessages = (updates) => {
    let messages = [];

    if (subscription.messages && subscription.messages.length > 0) {
      messages = subscription.messages;
      if (subscription.attributes.nowAvailableAsAddOns.length > 0) {
        messages.push(`New available this week: ${ subscription.attributes.nowAvailableAsAddOns.join(", ") }`);
      };
      return subscription.messages;
    };

    // add updated flag to rec_subscription_ids
    const update_shopify_ids = updates.map(el => el.shopify_product_id);
    let updated;
    const subscription_ids = subscription.attributes.rc_subscription_ids.map(el => {
      updated = update_shopify_ids.indexOf(el.shopify_product_id) === -1;
      return { ...el, updated };
    });
    //for (const el of subscription_ids) console.log(el);

    // only check titles here, don't care if a quantity has changed
    if (titlesOnly(subscription.properties["Removed Items"])
        !== titlesOnly(subscriptionSwaps_orig["Removed Items"])
      || titlesOnly(subscription.properties["Removed Items"])
        !== titlesOnly(subscriptionSwaps_orig["Removed Items"])) {
      messages.push("Swaps have changed.");
    };

    for (const item of subscription_ids) {
      if (!item.updated) {
        const orig = rc_subscription_ids_orig.find(el => el.shopify_product_id === item.shopify_product_id);
        if (item.quantity === 0) {
          messages.push(`${item.title} ${orig && orig.quantity > 0 && `(${orig.quantity}) ` }has been removed from your box.`);
        } else {
          if (orig) {
            if (orig.quantity !== item.quantity) {
              messages.push(`${item.title} quantity has changed from ${orig.quantity} to ${item.quantity}.`);
            };
          } else {
            // a new item
            messages.push(`${item.title} (${ item.quantity }) has been added to your box.`);
          };
        };
      };
    };
    return messages;
  };

  /*
   * @function testChanges
   * 
   * Gather data as if to make changes and log to console
   * Helper method, all links to this method have now been removed
   */
  const testChanges = async (type) => {
    let updates;
    if (type === "updates") {
      updates = subscription.updates;
    } else {
      updates = getUpdatesFromIncludes();
    };
    const change_messages = getChangeMessages(updates);
    console.log(change_messages);
    console.log("updates", JSON.stringify(updates, null, 2));
    const title = hasDuplicates();
    if (title) console.error(`${title} is duplicated in rc_subscription_ids`);
    console.log(dateStringNow(), userNavigator());
  };

  /*
   * @function doChanges
   * 
   * When the reconciled box shows changes with messages then the user must
   * save these changes before continuing
   * Also used by saveEdits to save changes made by the user.
   * Importantly no further updates can be sent until current changes are successfull.
   */
  const doChanges = async ({ key }) => {
    let updates;
    let label; // stored on pending_updates table
    if (key === "includes") {
      updates = getUpdatesFromIncludes();
      label = "updated";
    } else { // key = "updates"
      updates = subscription.updates;
      label = "reconciled";
    };
    let src = `/api/recharge-update`;
    src = `${src}?label=${label}`;

    // this value is saved to mongodb so we can track the updates and figure
    // when the new or updated charge is completed
    const attributes = { ...subscription.attributes };
    /*
    attributes.rc_subscription_ids = subscription.attributes.rc_subscription_ids.map(el => {
      return [ el.subscription_id, el.shopify_product_id, el.quantity ].sort();
    }).sort();
    */
    const properties = { ...subscription.properties };
    delete properties["Likes"];
    delete properties["Dislikes"];
    const includes = [ ...subscription.includes ];

    const id_array = attributes.rc_subscription_ids.map(el => el.title);
    const title = hasDuplicates();
    if (title) {
      fetchError = `Unable to save changes. Duplicate item in rc_subscription_ids ${title}. Please contact administrator`;
      editsPending = false;
      return this.refresh()
    };

    const change_messages = getChangeMessages(updates);

    // start the timer - can get this from the socket.closed event detail
    timer = new Date();

    const headers = { "Content-Type": "application/json" };
    const data = {
      updates,
      attributes,
      change_messages,
      properties,
      includes,
      now: dateStringNow(),
      navigator: userNavigator(),
      admin,
    };

    const callback = async (data) => {
      // data now contains the session_id and provides a connected socket
      loadingSession = data.session_id;
      await PostFetch({ src, data, headers })
        .then((result) => {
          const { error, json } = result;
          if (error !== null) {
            fetchError = error;
            loading = false;
            this.refresh();
          } else {
            // events handle the rest
            if (Object.hasOwnProperty.call(json, "message")) {
              this.dispatchEvent(toastEvent({
                notice: json.message,
                bgColour: "black",
                borderColour: "black"
              }));
            };
            if (Object.hasOwnProperty.call(json, "messages")) {
              collectMessages({ detail: { messages: json.messages }});
            };
          };
        })
        .catch((err) => {
          fetchError = err;
          loading = false;
          this.refresh();
        });
    };

    await getSessionId(callback, data, messageDivId, this);

  };

  this.addEventListener("toastEvent", Toaster);

  /**
   * @function productsChanged
   * @listens productChangeEvent From EditProducts component
   */
  const productsChanged = async (ev) => {
    const { type, product, properties: props, total_price } = ev.detail;
    // type shape is "to": the to list, "from: the from list, "count?": a quantity change
    // props are lists of { shopify_title, quantity } entries

    let rc_subscription_ids = [ ...subscription.attributes.rc_subscription_ids ];
    changed.push(product.shopify_product_id); // used to figure product toggling

    // update the properties with changed quantities and remove likes and dislikes
    // This updates the string values from the shopify_title, quantity returned from EditProducts
    for (const name of LABELKEYS) {
      if (name === "Delivery Date") continue;
      subscription.properties[name] = makeItemString(props[name]);
      delete subscription.properties["Likes"]; // dropping these slowly
      delete subscription.properties["Dislikes"];
    };

    // already an included subscribed product
    let includedIdx = -1;
    const included = subscription.includes.find(el => el.shopify_product_id === product.shopify_product_id);
    if (included) includedIdx = subscription.includes.indexOf(included);

    // already an removed subscribed product
    let removedIdx = -1;
    const removed = subscription.removed.find(el => el.shopify_product_id === product.shopify_product_id);
    if (removed) removedIdx = subscription.removed.indexOf(removed);

    const propertyTemplate = [
      { name: "Delivery Date", value: subscription.box.delivered },
      { name: "Add on product to", value: subscription.box.shopify_title },
      { name: "box_subscription_id", value: `${subscription.attributes.subscription_id}` },
    ];

    let addingProduct = false;
    let quantity;
    let rc_subscription;

    if (Object.hasOwnProperty.call(type, "from")) {
      if (type.from === "Add on Items" && type.to === "Available Products") {
        if (included) {
          // item to be removed from subscription
          const includedIdx = subscription.includes.findIndex(el => el.shopify_product_id === product.shopify_product_id);
          // save it as well in case they put it back in
          included.quantity = 0;
          subscription.removed.push(included)
          subscription.includes.splice(includedIdx, 1);
          //rc_subscription_ids = rc_subscription_ids.filter(el => el.shopify_product_id !== parseInt(product.shopify_product_id));
          rc_subscription = rc_subscription_ids.find(el => el.shopify_product_id === parseInt(product.shopify_product_id));
          if (Number.isInteger(rc_subscription.subscription_id)) {
            rc_subscription.quantity = 0;
          } else {
            rc_subscription_ids.splice(rc_subscription_ids.indexOf(rc_subscription), 1);
          };
        };
      };

      if (type.from === "Available Products" && type.to === "Swapped Items") {
      };

      if (type.from === "Including" && type.to === "Removed Items") {
        // was added in this sessioin
        rc_subscription = rc_subscription_ids.find(el => el.shopify_product_id === parseInt(product.shopify_product_id));
        if (rc_subscription) {
          if (!Number.isInteger(rc_subscription.subscription_id)) {
            // remove it
            rc_subscription_ids.splice(rc_subscription_ids.indexOf(rc_subscription), 1);
          } else {
            // set quantity to zero
            rc_subscription_ids[rc_subscription_ids.indexOf(rc_subscription)].quantity = 0;
          };
        };
      };

      if (type.from === "Swapped Items" && type.to === "Available Products") {
        // if it was in included - i.e. with a quantity and subscription then move to removed
        if (included) {
          // move item back into includes
          //subscription.includes[includedIdx].quantity = 1; // it was probably 0
          subscription.removed.push(included);
          subscription.includes.splice(includedIdx, 1);
        };
        // do we need something as for included products with the rc_subscription_ids?
      };

      if (type.from === "Swapped Items" && type.to === "Add on Items") {
        // here a bug exists that the item quantity has been increased yet I'm not removing the new subscription from rc_ids
        // is that fixed?
        rc_subscription = rc_subscription_ids.find(el => el.shopify_product_id === parseInt(product.shopify_product_id));
      };

      if (type.from === "Removed Items" && type.to === "Including") {
        // here a bug exists that the item quantity has been increased yet I'm not removing the new subscription from rc_ids
        rc_subscription = rc_subscription_ids.find(el => el.shopify_product_id === parseInt(product.shopify_product_id));
        if (rc_subscription) {
          if (!Number.isInteger(rc_subscription.subscription_id)) {
            // remove it
            rc_subscription_ids.splice(rc_subscription_ids.indexOf(rc_subscription), 1);
          } else {
            // set quantity to zero
            rc_subscription.quantity = 0;
            rc_subscription_ids.splice(rc_subscription_ids.indexOf(rc_subscription), 1, rc_subscription);
          };
        };
      };
      if (type.from === "Available Products" && type.to === "Add on Items") {
        if (removed) {
          subscription.removed[removedIdx].quantity = 1; // will have been set to zero
          rc_subscription = rc_subscription_ids.find(el => el.shopify_product_id === parseInt(product.shopify_product_id));
          subscription.includes.push(removed);
          if (rc_subscription) {
            rc_subscription.quantity = 1;
          } else {
            rc_subscription_ids.push({
              shopify_product_id: parseInt(product.shopify_product_id),
              subscription_id: parseInt(subscription.removed[removedIdx].subscription_id),
              quantity: parseInt(product.quantity),
            });
          };
          subscription.removed.splice(removedIdx, 1);
        } else {
          quantity = 1;
          addingProduct = true;
        };
      };
    };

    let addingWithList = type.to;
    if (Object.hasOwnProperty.call(type, "count")) {
      // fix depending on the list, i.e. if Including then decrement by 1, so that zero will remove in from includes
      addingWithList = type.count;
      quantity = (type.count === "Add on Items") ? product.quantity : product.quantity - 1;
      if (included) {
        if (quantity === 0 && type.count === "Add on Items") {
          // remove from included listing
          subscription.includes.splice(subscription.includes.indexOf(included), 1);
        } else {
          included.quantity = quantity;
        };
        rc_subscription = rc_subscription_ids.find(el => el.shopify_product_id === parseInt(product.shopify_product_id));
        if (rc_subscription) {
          if (Number.isInteger(rc_subscription.subscription_id)) {
            rc_subscription.quantity = quantity;
          } else {
            if (quantity === 0) {
              rc_subscription_ids.splice(rc_subscription_ids.indexOf(rc_subscription), 1);
            } else {
              rc_subscription.quantity = quantity;
            }
          };
        } else {
          quantity = 1;
          addingProduct = true;
        };
      } else {
        // rc_subscription_ids will be updated below
        quantity = 1;
        addingProduct = true;
      };
    };
    if (addingProduct) {
      // has this product already been removed?
      //
      // Example case: item was in addons, removed from addons, swapped and then incremented to quatity>1
      if (removed) {
        // move item back into includes
        subscription.removed[removedIdx].quantity = parseInt(quantity); // fix the quantity
        subscription.includes.push(removed)
        subscription.removed.splice(removedIdx, 1);
      } else {
        // push in a whole new item using templateSubscription
        subscription.includes.push({
          product_title: product.shopify_title,
          title: product.shopify_title,
          ...subscription.attributes.templateSubscription,
          price: `${(product.shopify_price * 0.01).toFixed(2)}`,
          total_price: `${(product.shopify_price * 0.01).toFixed(2)}`,
          quantity,
          external_product_id: {
            ecommerce: `${product.shopify_product_id}`
          },
          external_variant_id: {
            ecommerce: `${product.shopify_variant_id}`
          },
          properties: [ ...propertyTemplate ],
          shopify_product_id: product.shopify_product_id, // so we can still find it in the list
        });
      };

      // bugfix here, found that I can push a new item onto rc_subscription_ids
      // even though it may already be present with quantity set to zero, i.e.
      // a deletion

      let rc_product = rc_subscription_ids.find(el => el.shopify_product_id === parseInt(product.shopify_product_id));
      if (rc_product) {
        // simply update the quantity
        rc_product.quantity = parseInt(quantity);
        rc_product = rc_subscription_ids.find(el => el.shopify_product_id === parseInt(product.shopify_product_id));
      } else {
        rc_subscription_ids.push({
          shopify_product_id: parseInt(product.shopify_product_id),
          subscription_id: null,
          title: product.shopify_title,
          quantity: parseInt(quantity),
        });
      };
    };

    const bar = document.querySelector(`#saveBar-${subscription.attributes.subscription_id}`);
    bar.classList.add("open");
    const el = document.querySelector(`#skip_cancel-${subscription.attributes.subscription_id}`);
    el.classList.add("dn");

    subscription.attributes.rc_subscription_ids = [ ...rc_subscription_ids ];
    // and update the total price
    subscription.attributes.totalPrice = floatToString(total_price);

  };

  /**
   * For updating product lists
   *
   * @listens productsChangeEvent From EditProducts
   */
  this.addEventListener("productsChangeEvent", productsChanged);

  /**
   * @function getUpdatesFromIncludes
   * Figure out what has been updated for submitting data
   */
  const getUpdatesFromIncludes = () => {
    let updates = [];
    let found;
    let subscriptionBox = subscription.includes.find(el => el.subscription_id === subscription.attributes.subscription_id);
    for (const item of subscription.attributes.rc_subscription_ids) {
      let updateItem = null;
      found = rc_subscription_ids_orig.find(el => el.shopify_product_id === item.shopify_product_id);
      if (found && found.quantity !== item.quantity) {
        const removed = subscription.removed.some(el => el.shopify_product_id === item.shopify_product_id);
        const included = subscription.includes.some(el => el.shopify_product_id === item.shopify_product_id);
        if (item.quantity === 0) {
          if (removed) {
            // i.e. was in Add on Items
            updateItem = subscription.removed.find(el => el.shopify_product_id === item.shopify_product_id);
          } else {
            // i.e. was in Including with an extra
            updateItem = subscription.includes.find(el => el.shopify_product_id === item.shopify_product_id);
            updateItem.quantity = item.quantity; // namely zero
          };
        } else {
          updateItem = subscription.includes.find(el => el.shopify_product_id === item.shopify_product_id);
        };
      } else if (!found) {
        updateItem = subscription.includes.find(el => el.shopify_product_id === item.shopify_product_id);
      };
      if (updateItem) {
        updates.push(updateItem);
      };
    };
    let updateBox = false;
    // the box subscription will be picked up when rc_subscription_ids change but not when making a single swap
    // also need to pick up if swaps have been made which won't show up in rc_subscription_ids
    if (subscription.properties["Removed Items"]
        !== subscriptionSwaps_orig["Removed Items"]
      || subscription.properties["Swapped Items"]
        !== subscriptionSwaps_orig["Swapped Items"]) {
      updateBox = true;
    };
    if (updates.length > 0 || updateBox) {
      subscriptionBox.properties = Object.entries(subscription.properties).map(([name, value]) => {
        if (name !== "box_subscription_id") return { name, value };
        return null;
      }).filter(el => el !== null);
      subscriptionBox.properties.push({
        name: "box_subscription_id", value: `${subscription.attributes.subscription_id}`
      });
      updates.push(subscriptionBox);
    };
    // make sure that the box is last
    for(var x in updates) updates[x].properties.some(el => el.name === "Including") ? updates.push( updates.splice(x,1)[0] ) : 0;
    return updates;
  };

  /**
   * @function cancelEdits
   * Cancel changes made - see Customer but it only reverts back to initial api query
   */
  const cancelEdits = () => {
    const bar = document.querySelector(`#saveBar-${subscription.attributes.subscription_id}`);
    bar.classList.remove("open");

    // let the save bar close nicely first
    setTimeout(() => {
      this.dispatchEvent(
        new CustomEvent("customer.reload", {
          bubbles: true,
          detail: { charge_id: subscription.attributes.charge_id },
        })
      );
    }, 500);
  };

  /*
   * @function listingReload
   * @listens listing.reload
   *
   * Gets reply from the PostFetch request from form-modals
   * Updates attributes if dates have changed
   * Collapses products and indicates that changes/edits are pending
   *
   */
  const listingReload = async (ev) => {
    const result = ev.detail.json; // success, action, subscription_id

    console.log("listing.reload", ev.detail);

    // start the timer
    timer = new Date();

    loadingSession = ev.detail.session_id;

    // not using any of this result!!
    // could use subscription_id to verify the component?
    // could use action to add to the messaging, 'reschedule pause' etc?

    const subscription_id = result.subscription_id;
    // update attributes nextChargeDate, nextDeliveryDate, scheduled_at
    // details on updating charge date
    // simply makes a "pretend" update to the viewed subscription
    if (Object.hasOwnProperty.call(result, "scheduled_at")) {
      // update dates from skip and unskip
      subscription.attributes.scheduled_at = result.scheduled_at;
      subscription.attributes.nextChargeDate = result.nextchargedate;
      subscription.attributes.nextDeliveryDate = result.nextdeliverydate;
      subscription.attributes.hasNextBox = result.hasNextBox;
      // and update the new product template
      subscription.attributes.templateSubscription.next_charge_scheduled_at = result.scheduled_at;
    };

    editsPending = true;

    // tell Customer to disable other subscriptions
    this.dispatchEvent(new CustomEvent("customer.disableevents", {
      bubbles: true,
      detail: { subscription_id },
    }));

    // forces reload of component?
    CollapsibleProducts = CollapseWrapper(EditProducts);
    await this.refresh();

    delay(2000);
    try {
      document.getElementById(`products-${subscription_id}-${idx}`).classList.add("disableevents");
      document.getElementById(`buttons-${subscription_id}-${idx}`).classList.add("disableevents");
      document.getElementById(`saveMessages-${subscription_id}`).classList.remove("dn");
    } catch(e) {
      // should never fail
      console.warn(e);
    };

    return;
  };

  // listing.reload dispatched by form-modal
  this.addEventListener("listing.reload", listingReload);

  /*
   * @function AttributeRow
   * Layout helper
   */
  const AttributeRow = ({ title, value }) => {
    return (
      <Fragment>
        <div class={`dtc gray tr pr3 pv1${title.startsWith("Next") ? " b" : ""}`}>
          { title }:
        </div>
        <div class={`dtc pv1${title.startsWith("Next") ? " b" : ""}`}>
          <span>{ value }</span>
        </div>
      </Fragment>
    );
  };

  /*
   * @function AttributeColumn
   * Layout helper
   */
  const AttributeColumn = ({ data }) => {
    return (
      data.map(([title, value]) => (
        value && (
          <div class="dt dt--fixed w-100">
            <AttributeRow title={ title } value={ value } />
          </div>
        )
      ))
    );
  };

  /*
   * @member idData
   * Layout helper
   */
  const idData = () => {
    return [
      ["Subscription ID", subscription.attributes.subscription_id],
      ["Charge Id", subscription.attributes.charge_id],
      ["Address Id", subscription.attributes.address_id],
      ["Recharge Customer Id", subscription.attributes.customer.id],
      ["Shopify Customer Id", subscription.attributes.customer.external_customer_id.ecommerce],
    ];
  };

  /*
   * @function AddressColumn
   * Layout helper
   */
  const AddressColumn = ({ data }) => {
    return (
      data.map((value) => (
        value && (
          <span class="db">{value}</span>
        )
      ))
    );
  };

  /*
   * Determine if can be rescheduled
   * Cannot reschedule if it means going back to scheduled delivery date
   * which can happen on two week subscriptions and original order out in the future
   * july 2023 Changed this to allow unskippable provided there is still time
   * before the charge upcoming webhook is received
   */

  const isUnSkippable = () => {

    const getDiffDays = (subscription) => {
      const now = new Date();
      const nextCharge = new Date(Date.parse(subscription.attributes.nextChargeDate));
      // this a charge date but that is correct because we cannot charge an order today!
      let diffDays = Math.ceil(Math.abs(nextCharge - now) / (1000 * 60 * 60 * 24));

      // XXX need to also account for the lastOrder.delivered date
      const ts = Date.parse(subscription.attributes.lastOrder.delivered); // could be null ie lastOrder = {}
      let lastDelivered;
      let orderDiffDays;
      if (!isNaN(ts)) { // can happen if the order is not completed or found by the api
        // note that we're comparing a charge date against a delivery date
        lastDelivered = new Date(ts);
        orderDiffDays = Math.ceil(Math.abs(nextCharge - lastDelivered ) / (1000 * 60 * 60 * 24));
        diffDays = orderDiffDays > diffDays ? diffDays : orderDiffDays;
      };

      // so this modal only shows if diffDays in greater than 8 days and last order was earlier than then
      return diffDays;
    };

    // so this modal only shows if diffDays in greater than 8 days
    const interval = 7; // allow fortnightly subscriptions to also reschedule by a week
    const diffDays = getDiffDays(subscription);
    return diffDays > interval;

  };

  /**
   * Hold flag as to subscription being unskippable (i.e. Reschedule)
   *
   * @member {array} unskippable
   */
  let unskippable = isUnSkippable();
  /*
   * @member addressData
   * Layout helper
   */

  const addressData = () => {
    return [
      `${subscription.address.first_name} ${subscription.address.last_name}`,
      subscription.address.email,
      subscription.address.address1,
      subscription.address.address2 ? subscription.address.address2 : "",
      subscription.address.city,
      subscription.address.zip,
      subscription.address.phone,
      subscription.address.email,
    ];
  };

  /*
   * @member chargeData
   * Layout helper
   */
  const chargeData = () => {
    const data = [
      ["Next Payment Date", subscription.attributes.nextChargeDate],
      ["Next Scheduled Delivery", subscription.attributes.nextDeliveryDate],
      ["Frequency", subscription.attributes.frequency],
      //["Order Delivered", subscription.attributes.lastOrder.delivered],
      ["Subscription ID", subscription.attributes.subscription_id],
    ];
    if (Boolean(subscription.attributes.lastOrder)
      && Object.hasOwnProperty.call(subscription.attributes.lastOrder, "order_number")) {
      const now = new Date();
      let title;
      if (Date.parse(subscription.attributes.lastOrder.delivered) < now.getTime()) {
        title = "Last Order Delivered";
      } else {
        title = "Current Order Scheduled For";
      };
      data.push(
        [title, `${subscription.attributes.lastOrder.delivered} (#${subscription.attributes.lastOrder.order_number})`],
      );
    };
    return data;
  };

  const modalWindow = document.getElementById("modal-window");
  const host = localStorage.getItem("host"); // server host e.g. https://myshop.boxexapp.nz

  const toggleExplainer = () => {
    isExplainerOpen = !isExplainerOpen;
    this.refresh();
  };

  const hideExplainer = async (ev) => {
    if (ev.key && ev.key === "Escape" && isExplainerOpen) {
      isExplainerOpen = false;
      this.refresh();
    };
  };

  window.document.addEventListener("keyup", hideExplainer);

  /*
   * @function reloadSubscription
   * Reload this particular charge from the server as a 'subsciption' object
   * @listens socket.closed
   */
  const reloadSubscription = async (ev) => {
    if (ev.detail.session_id !== loadingSession) return;
    console.log(ev.detail.session_id);
    console.log(loadingSession);
    console.log(ev.detail.subscription_id);
    console.log(subscription.attributes.subscription_id);
    ev.stopPropagation();
    const socketMessages = document.getElementById(messageDivId);
    const saveMessages = document.getElementById(`saveMessages-${ev.detail.subscription_id }`);

    // keep things nicely paced and slow
    socketMessages.classList.add("closed"); // has 2s transition
    await delay(1000);
    socketMessages.innerHTML = "";
    saveMessages.classList.add("closed");
    await delay(1000);
    saveMessages.classList.add("dn");
    window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
    });
    await delay(500);
    loadingSession = null;
    if (timer) {
      const timeTaken = findTimeTaken(timer);
      timer = null;
      this.dispatchEvent(toastEvent({
        notice: `Updates (${ev.detail.action}) completed after ${timeTaken} minutes` ,
        bgColour: "black",
        borderColour: "black"
      }));
    };
    // get Customer to reload everything
    this.dispatchEvent(new CustomEvent(`subscription.updates.completed`, {
      bubbles: true,
      detail: ev.detail,
    }));
    return;
  };

  // socket.closed when webhooks are received that verify that all updates have been completed
  window.addEventListener("socket.closed", reloadSubscription);

  const userActions = ["reconciled", "updated", "changed", "paused", "rescheduled", "cancelled", "reactivated", "deleted", "created"];

  for await ({ subscription, idx, admin, brokenSubscriptions, completedAction } of this) { // eslint-disable-line no-unused-vars

    yield (
      <div 
        id={ `subscription-${subscription.attributes.subscription_id}` }
        class={ brokenSubscriptions.includes(subscription.attributes.subscription_id) ? "disableevents" : "" }>
        <h4 class="tl mb0 w-100 fg-streamside-maroon">
          {subscription.attributes.title} - {subscription.attributes.variant}
          { completedAction && (
            <span id={ `action-${subscription.attributes.subscription_id}` }
              class={ `b pv1 ph3 sans-serif white bg-${
                completedActions[completedAction]
              } ba b--${
                completedActions[completedAction]
              } br3 ml3 mb1 v-base` } style="font-size: smaller">{ completedAction }</span>
          )}
        </h4>
        { admin && false && (
          userActions.map(el => (
            <button onclick={ (ev) => testUserAction(el) }>{ el }</button>
          ))
        )}
        { (!subscription.attributes.hasNextBox && !editsPending) && (
          <div class="pv2 orange">Box items not yet loaded for <span class="b">
              { subscription.attributes.nextDeliveryDate }
          </span></div>
        )}
        <div class="flex-container-reverse w-100 pt2 relative" id={ `title-${idx}` }>
          { admin && (
            <div class="dt">
              <AttributeColumn data={ idData() } />
            </div>
          )}
          <div class="dt">
            <div class="">
              <AttributeColumn data={ chargeData() } />
            </div>
          </div>
          <div class="dt tr nowrap">
            <AddressColumn data={ addressData() } />
          </div>
        </div>
        { subscription.messages.length === 0 && (
          <div id={`skip_cancel-${subscription.attributes.subscription_id}`} class="cf w-100 pv2">
            <div id={ `buttons-${subscription.attributes.subscription_id}-${idx}` }
                class="w-100 flex-container-reverse">
              <Button type="success-reverse"
                onclick={toggleCollapse}
                title={ collapsed ? (subscription.attributes.hasNextBox && !editsPending ? "Edit products" : "Show products") : "Hide products" }
              >
                <span class="b">
                  { collapsed ? (subscription.attributes.hasNextBox && !editsPending ? "Edit products" : "Show products") : "Hide products" }
                </span>
              </Button>
              { ( !editsPending ) && collapsed && (
                <Fragment>
                  <CancelSubscriptionModal subscription={ subscription }
                    admin={ admin }
                    socketMessageId={ `${messageDivId}` } />
                  <SkipChargeModal subscription={ subscription }
                    admin={ admin }
                    socketMessageId={ `${messageDivId}` } />
                  <EditBoxModal
                    subscription={ subscription }
                    customer={ customer }
                    admin={ admin }
                    type="changed"
                    socketMessageId={ `${messageDivId}` } />
                  { unskippable && (
                    <UnSkipChargeModal subscription={ subscription }
                      admin={ admin }
                      socketMessageId={ `${messageDivId}` } />
                  )}
                  { admin && (
                    <LogsModal customer_id={ subscription.attributes.customer.id }
                      subscription_id={ subscription.attributes.subscription_id }
                      admin={ admin }
                      box_title={ `${subscription.attributes.title} - ${subscription.attributes.variant}` } />
                  )}
                </Fragment>
              )}
            </div>
          </div>
        )}
        { !subscription.attributes.hasNextBox && !collapsed && (
          <div class="alert-box dark-blue pa2 ma1 mt3 br3 ba b--dark-blue bg-washed-blue">
            <p class="">You will be able to edit your box products when the next box has been loaded.</p>
          </div>
        )}
        { (editsPending || subscription.attributes.pending) && (
          <Fragment>
            <div id={ `saveMessages-${subscription.attributes.subscription_id }` }
              class="tl w-100 saveMessages dn">
              <div class="alert-box relative dark-blue pa2 ma1 br3 ba b--dark-blue bg-washed-blue">
                { ( !subscription.attributes.pending) && (
                  <div class="i fr cf mr3 pt2 pb1 ph1 pointer bb"
                    onclick={ toggleExplainer }
                  >
                    Why can it take so long to update my subscription?
                  </div>
                )}
                <p class="pa3 ma0">
                  { ( subscription.attributes.pending) ? (
                    <div>Your subscription has updates pending.</div>
                  ) : (
                    <div>Your updates have been queued for saving.</div>
                  )}
                  { ( subscription.attributes.pending) ? (
                    <div>Please return to this page later to edit your subscription.</div>
                  ) : (
                    <div>
                      This can take several minutes. You may close the window and come back to it later. { " " }
                    </div>
                  )}
                  <div>Check your emails for confirmation of the updates you have requested.</div>
                </p>
                <div id={ `displayMessages-${subscription.attributes.subscription_id }` } class="fg-streamside-blue">
                  { " " }
                </div>
                { (!subscription.attributes.pending) && (
                  <ProgressLoader />
                )}
              </div>
            </div>
          </Fragment>
        )}
        <div id={ messageDivId } class="tl w-100 socketMessages"></div>
        { subscription.messages.length > 0 && subscription.attributes.hasNextBox && !editsPending && (
          <div class="alert-box dark-blue pv2 ma1 br3 ba b--dark-blue bg-washed-blue">
              <Fragment>
                <p class="pa3">Before continuing the subscription needs to be reconciled with the upcoming box:</p>
                <ul class="ma0">
                  { subscription.messages.map(el => <li>{el}</li>) }
                </ul>
                { subscription.attributes.nowAvailableAsAddOns.length > 0 && (
                  <p class="pl5">New available this week: { subscription.attributes.nowAvailableAsAddOns.join(", ") }</p>
                )}
                <div class="tr mv2 mr3">
                  <Button type="primary-reverse"
                    title="Continue"
                    onclick={(ev) => saveChanges("updates", ev)}>
                    <span class="b">
                      Apply changes to continue
                    </span>
                  </Button>
                  { false && (
                    <div class="dib pr2" id="testChanges">
                      <Button
                        onclick={ (ev) => testChanges("updates", ev) }
                        hover="dim"
                        type="alt-primary">
                        Test
                      </Button>
                    </div>
                  )}
                  <Button type="success-reverse"
                    onclick={toggleCollapse}
                    title={ collapsed ? "Show products" : "Hide products" }
                  >
                    <span class="b">
                      { collapsed ? "Show products" : "Hide products" }
                    </span>
                  </Button>
                </div>
              </Fragment>
          </div>
        )}
        { loading && <div id={ `loader-${idx}` }><BarLoader /></div> }
        { fetchError && <Error msg={fetchError} /> }
        <div id={`saveBar-${subscription.attributes.subscription_id}`} class="save_bar white mv1 br2">
          <div class="flex-container w-100 pa2">
            <div class="w-100 pl4" style="line-height: 2em">
              <span class="bold v-mid">
                Unsaved changes
              </span>
            </div>
            <div class="w-100 tr">
              <div class="dib pr2 nowrap">
                <Button
                  onclick={ cancelEdits }
                  classes="b"
                  type="transparent/dark">
                  Cancel
                </Button>
              </div>
              <div class="dib pr2" id="saveEdits">
                <Button
                  onclick={ (ev) => saveChanges("includes", ev) }
                  hover="dim"
                  classes="b"
                  border="white"
                  type="alt-primary">
                  Save
                </Button>
              </div>
              { false && (
                <div class="dib pr2" id="testChanges">
                  <Button
                    onclick={ (ev) => testChanges("includes", ev) }
                    hover="dim"
                    border="navy"
                    type="primary">
                    Test
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div class="mb2 bb b--black-80">
          <div id={ `products-${subscription.attributes.subscription_id}-${idx}` }>
            { subscription.attributes.title !== "" && (
              <CollapsibleProducts
                collapsed={ collapsed }
                rc_subscription_ids={ subscription.attributes.rc_subscription_ids }
                properties={ subscription.properties }
                box={ subscription.box }
                nextChargeDate={ subscription.attributes.nextChargeDate }
                isEditable={ subscription.messages.length === 0 && subscription.attributes.hasNextBox && !editsPending }
                key={ idx }
                id={ `subscription-${subscription.attributes.subscription_id}-${idx}` }
              />
            )}
          </div>
        </div>
        { isExplainerOpen && (
          <Portal root={modalWindow}>
            <ModalTemplate closeModal={ toggleExplainer } loading={ false } error={ false }>
              <h4 class="ml4 fw4 tl fg-streamside-maroon">Why can it take so long to update my subscription?</h4>
              <p class="pa4">
                <img src={ `${ host }/logos/boxes.png` } width="50" />
                In order to ensure the integrity of your box
                subscripton we must be sure that all updates have completed
                before you are able to continue editing your box. The boxes
                are a linking between two web services: 1. the store and 2.
                the subscription service. When an update is requested a
                number of calls are made between the services to complete the
                update. We have recorded eelays of up to 3 minutes for the
                order to be finalised and updated on our subscriptions
                service.
              </p>
              <p class="pb4 ph4 pt0">
                You are welcome to close this window at any time, your
                updates will continue to be processed. Please check your
                emails for notification of the completion of the requested
                changes.
              </p>
            </ModalTemplate>
          </Portal>
        )}
      </div>
    )
  };
};

export default Subscription;
