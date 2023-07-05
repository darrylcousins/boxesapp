/**
 * Makes subscription component
 *
 * @module app/recharge/subscription
 * @exports Subscription
 * @requires module:app/recharge/subscription
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { io } from "socket.io-client";
import { createElement, Fragment } from "@b9g/crank";
import CollapseWrapper from "../lib/collapse-animator";
import EditProducts from "../products/edit-products";
import Error from "../lib/error";
import { PostFetch, Fetch } from "../lib/fetch";
import { toastEvent } from "../lib/events";
import Timer from "../lib/timer";
import Toaster from "../lib/toaster";
import BarLoader from "../lib/bar-loader";
import Button from "../lib/button";
import TextButton from "../lib/text-button";
import SkipChargeModal from "./skip-modal";
import UnSkipChargeModal from "./unskip-modal";
import LogsModal from "../log/logs-modal";
import CancelSubscriptionModal from "./cancel-modal";
import {
  animateFadeForAction,
  animateFade,
  collapseElement,
  transitionElementHeight,
  LABELKEYS
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
async function *Subscription({ subscription, idx, allowEdits, admin }) {


  console.log("Box", subscription.box);
  console.log("Address", subscription.address);
  console.log("Attributes", subscription.attributes);
  console.log("Messages", subscription.messages);
  console.log("Properties", subscription.properties);
  console.log("Includes", subscription.includes);
  console.log("Ids", JSON.stringify(subscription.attributes.rc_subscription_ids, null, 2));
  console.log(JSON.stringify(
    subscription.attributes.rc_subscription_ids.map(el => {
      return [ el.subscription_id, el.shopify_product_id, el.quantity ].sort();
    }).sort()
    ,null, 2));

  let CollapsibleProducts = CollapseWrapper(EditProducts);
  /**
   * Simple hold on to the original list as copies of the objects in the list
   * These are { quantity, subscription_id, shopify_product_id }
   *
   * @member {array} rc_subscription_ids_orig
   */
  const rc_subscription_ids_orig = subscription.attributes.rc_subscription_ids.map(el => { return {...el}; });
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
   * How long to delay reloading after submitting changes
   *
   * @member {array} timerSeconds
   */
  const timerSeconds = 30;
  /**
   * Hold changed items
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
   * Success after saving changes
   *
   * @member {boolean} success
   */
  let success = false;
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
   * The attempts attribute to force restart of Timer and count attempts
   *
   * @member {integer} attempts
   */
  let attempts = 0;
  /**
   * A save has been done so don't allow edits
   *
   * @member {object|string} editsPending
   */
  //let editsPending = Boolean(subscription.attributes.pending);
  let editsPending;
  /**
   * The subscription logs if any
   *
   * @member {object} subscriptionLogs
   */
  let subscriptionLogs = [];

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
    if (changed.length > 0) {
      setTimeout(() => {
          const bar = document.querySelector(`#saveBar-${subscription.attributes.subscription_id}`);
          bar.classList.add("open");
          const el = document.querySelector(`#skip_cancel-${subscription.attributes.subscription_id}`);
          el.classList.add("dn");
        }, 
        1000);
    };
  };

  /*
   * Get and connect to socket.io, on connect insert the sessionId into the
   * data then call the submission method 'callback'
   * @function getSessionId
   */
  const getSessionId = async (callback, data) => {
    const proxy = localStorage.getItem("proxy-path");
    const sessionId = Math.random().toString(36).substr(2, 9);
    const host = `https://${ window.location.host }`;
    const socket = io(host, {
      autoConnect: true, // could also do this with socket.open()
      path: `${proxy}/socket-io`,
      transports: ["polling"], // disable websocket polling - no wss on shopify
    });
    socket.emit('connectInit', sessionId);
    socket.on('connected', async (id) => {
      if (id === sessionId) {
        console.log('connected with id', id);
      };
    });
    socket.on('uploadProgress', async (data) => {
      console.log(data);
      // display data or update timer
    });
    socket.on('finished', async (id) => {
      if (id === sessionId) {
        console.log('closing connection for id', id);
        socket.disconnect();
      };
    });
    socket.on('connect', async () => {
      console.log("connection opened with id", sessionId);
      // do the work
      data.sessionId = sessionId;
      await callback(data);
    });
    socket.on('disconnect', async () => {
      console.log("connection closed with id", sessionId);
    });
  };


  /*
   * @function saveChanges
   *
   * Initiates the socket and calls doChanges
   */
  const saveChanges = async (key) => {
    editsPending = true;
    CollapsibleProducts = CollapseWrapper(EditProducts);
    await this.refresh();
    await doChanges({ key });

    // try again later with this
    //await getSessionId(doChanges, { key });
  };

  /*
   * @function doChanges
   * 
   * When the reconciled box shows changes with messages then the user must
   * save these changes before continuing
   * Also used by saveEdits to save changes made by the user.
   * Importantly no further updates can be sent until current changes are successfull.
   */
  const doChanges = async ({ key, sessionId }) => {
    let updates;
    if (key === "includes") {
      // find the loaded image for the added items (loaded from shopify)
      for (const item of subscription.includes) {
        if (Object.hasOwnProperty.call(item, "external_product_id")) {
          const div = document.getElementById(`image-${item.product_title.replace(/ /g, "-")}`);
          if (div) {
            const img = div.firstChild;
            const style = img.currentStyle || window.getComputedStyle(img, false);
            const url = style.backgroundImage.slice(4, -1).replace(/['"]/g, "");
            item.images = { small: url }
          };
        };
      };
      updates = getUpdatesFromIncludes();
    } else {
      updates = subscription.updates;
    };
    let headers = { "Content-Type": "application/json" };
    let src = `/api/recharge-update`;
    if (sessionId) {
      src = `${src}?session_id=${sessionId}`;
    };

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

    const data = { updates, attributes, properties };
    await PostFetch({ src, data, headers })
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          // remove the zerod items
          subscription.messages = [];
          subscription.updates = [];
          subscription.removed = [];
          changed = [];

          console.log("returned message: ", json.message);

          /*
          let notice;
          if (key === "updates") {
            notice = "Subscription updated to match upcoming box";
          } else {
            notice = "Subscription updates saved";
          };
          this.dispatchEvent(toastEvent({
            notice,
            bgColour: "black",
            borderColour: "black"
          }));
          */
        }
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
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
    console.log(type);
    console.log(props);

    let rc_subscription_ids = [ ...subscription.attributes.rc_subscription_ids ];
    changed.push(product.shopify_product_id);

    // update the properties with changed quantities and remove likes and dislikes
    // This updates the string values from the shopify_title, quantity returned from EditProducts
    for (const name of LABELKEYS) {
      if (name === "Delivery Date") continue;
      subscription.properties[name] = makeItemString(props[name]);
      delete subscription.properties["Likes"]; // dropping these slowly
      delete subscription.properties["Dislikes"];
    };

    // already an included subscribed product
    const included = subscription.includes.find(el => el.shopify_product_id === product.shopify_product_id);

    const propertyTemplate = [
      { name: "Delivery Date", value: subscription.box.delivered },
      { name: "Add on product to", value: subscription.box.shopify_title },
      { name: "box_subscription_id", value: `${subscription.attributes.subscription_id}` },
    ];

    let addingProduct = false;
    let quantity;
    let rc_subscription;

    if (Object.hasOwnProperty.call(type, "from")) {
      console.log(type.from, type.to);
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
      if (type.from === "Available Products" && type.to === "Add on Items") {
        const removedIdx = subscription.removed.findIndex(el => el.shopify_product_id === product.shopify_product_id);
        console.log("XXXX", JSON.stringify(subscription.removed, null, 2));
        if (removedIdx !== -1) {
          subscription.removed[removedIdx].quantity = 1; // will have been set to zero
          rc_subscription = rc_subscription_ids.find(el => el.shopify_product_id === parseInt(product.shopify_product_id));
          subscription.includes.push(subscription.removed[removedIdx]);
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

    if (Object.hasOwnProperty.call(type, "count")) {
      // fix depending on the list, i.e. if Including then decrement by 1, so that zero will remove in from includes
      quantity = (type.count === "Add on Items") ? product.quantity : product.quantity - 1;
      console.log("has count", type.count, quantity);
      if (included) {
        if (quantity === 0) {
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
        };
      } else {
        // rc_subscription_ids will be updated below
        quantity = 1;
        addingProduct = true;
      };
    };
    if (addingProduct) {
      subscription.includes.push({
        product_title: product.shopify_title,
        ...subscription.attributes.templateSubscription,
        price: `${(product.shopify_price * 0.01).toFixed(2)}`,
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
      rc_subscription_ids.push({
        shopify_product_id: parseInt(product.shopify_product_id),
        subscription_id: null,
        quantity: parseInt(quantity),
      });
    };

    const bar = document.querySelector(`#saveBar-${subscription.attributes.subscription_id}`);
    bar.classList.add("open");
    const el = document.querySelector(`#skip_cancel-${subscription.attributes.subscription_id}`);
    el.classList.add("dn");

    /*
    console.log("Original", JSON.stringify(rc_subscription_ids_orig, null, 2));
    console.log("Attributes", JSON.stringify(subscription.attributes.rc_subscription_ids, null, 2));
    console.log("Updates", JSON.stringify(rc_subscription_ids, null, 2));
    */
    // update these in place
    subscription.attributes.rc_subscription_ids = [ ...rc_subscription_ids ];

    // was using "changed" but now comparing rc original with updated
    const updates = getUpdatesFromIncludes();
    console.log(JSON.stringify(updates, null, 2));


    /* REMOVE BELOW _ DEV */
    //console.log(JSON.stringify(subscription.includes, null, 2));

    const tuples = subscription.attributes.rc_subscription_ids.map(el => {
      return [ el.subscription_id, el.shopify_product_id, el.quantity ].sort();
    }).sort();
    console.log(JSON.stringify(tuples, null, 2));
    console.log(JSON.stringify(subscription.properties, null, 2));
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
        if (item.quantity === 0) {
          updateItem = subscription.removed.find(el => el.shopify_product_id === item.shopify_product_id);
        } else {
          updateItem = subscription.includes.find(el => el.shopify_product_id === item.shopify_product_id);
        };
      } else if (!found) {
        updateItem = subscription.includes.find(el => el.shopify_product_id === item.shopify_product_id);
      };
      if (updateItem) {
        updates.push(updateItem);
        console.log("Pushing updateItem:", JSON.stringify(updateItem, null, 2));
      };
    };
    let updateBox = false;
    // the box subscription will be picked up when rc_subscription_ids change but not when making a single swap
    /*
    console.log("box removed", subscription.properties["Removed Items"]);
    console.log("orig removed", subscriptionSwaps_orig["Removed Items"]);
    console.log("box swapped", subscription.properties["Swapped Items"]);
    console.log("orig swapped", subscriptionSwaps_orig["Swapped Items"]);
    */
    // also need to pick up if swaps have been made which won't show up in rc_subscription_ids
    if (subscription.properties["Removed Items"]
        !== subscriptionSwaps_orig["Removed Items"]
      || subscription.properties["Swapped Items"]
        !== subscriptionSwaps_orig["Swapped Items"]) {
      updateBox = true;
    };
    if (updates.length > 0 || updateBox) {
      subscriptionBox.properties = Object.entries(subscription.properties).map(([name, value]) => {
        return { name, value };
      });
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
   * @function saveEdits
   * Save the changes made
   */
  const saveEdits = () => {
    /* No longer using "changed", now using rc_subscription_ids and compare to orig
    const box_id = subscription.box.shopify_product_id;
    // update the values for the subscription box
    const boxInclude = subscription.includes.find(el => el.shopify_product_id === box_id);
    changed.push(box_id);
    */
    saveChanges("includes");
  };

  /**
   * @function cancelEdits
   * Cancel changes made - see Customer but it only reverts back to initial api query
   */
  const cancelEdits = () => {
    this.dispatchEvent(
      new CustomEvent("customer.reload", {
        bubbles: true,
        detail: { charge_id: subscription.attributes.charge_id },
      })
    );
  };

  /*
   * @function getCharge
   * Fetch the charge as a "subscription" object
   */
  const getCharge = async (charge_id) => {
    const rc_subscription_ids = subscription.attributes.rc_subscription_ids.map(el => {
      return [ el.subscription_id, el.shopify_product_id, el.quantity ];
    }).sort();
    let uri = `/api/recharge-customer-charge/${charge_id}`;
    uri = `${uri}?customer_id=${subscription.attributes.customer.id}`;
    uri = `${uri}&address_id=${subscription.attributes.address_id}`;
    uri = `${uri}&subscription_id=${subscription.attributes.subscription_id}`;
    uri = `${uri}&rc_subscription_ids=${JSON.stringify(rc_subscription_ids)}`;
    uri = `${uri}&scheduled_at=${subscription.attributes.scheduled_at}`;
    console.log(uri);
    return Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          return null;
        } else {
          return json.subscription;
        };
      })
      .catch((err) => {
        fetchError = err;
      });
  };

  /**
   * @function reloadCharge
   * Reload this particular charge from the server as a 'subsciption' object
   */
  const reloadCharge = async (restartTimer, killTimer) => {
    loading = true;
    this.refresh();

    const charge = await getCharge(subscription.attributes.charge_id);
    await getLogs();  // refresh the logs
    console.log("Back to here?", charge);
    if (charge) {
      //console.log(charge.includes);
      console.log(charge.attributes);
      //console.log(subscription.includes);
      console.log(subscription.attributes);
      Object.assign(subscription, charge);
      console.log("HERE", subscription.attributes.pending);
      editsPending = Boolean(subscription.attributes.pending);
      fetchError = null;
      CollapsibleProducts = CollapseWrapper(EditProducts);
      attempts = 0;
      if (killTimer) killTimer();
    } else {
      attempts += 1; // force Timer reload and count attempts
    };
    loading = false;
    await this.refresh();
    if (subscription.attributes.pending) {
      if (restartTimer) restartTimer(timerSeconds);
    };
  };

  /*
   * Same copied to Cancelled
   * Tidy display of subscriptions after skip and cancel submissions made
   * (skip-modal, unskip-modal, cancel-modal)
   * Possible actions are cancelled, deleted, reactivated, and updated (dates)
   */
  const reLoad = async (ev) => {
    const result = ev.detail.json; // success, action, subscription_id
    const subscription_id = result.subscription_id;

    const event = `subscription.${result.action}`;
    console.log(event);
    editsPending = true;
    CollapsibleProducts = CollapseWrapper(EditProducts);
    await this.refresh();
    return; // don't need to reload but need to set editsPending

    const subdiv = document.querySelector(`#subscription-${result.subscription_id}`);
    const div = document.querySelector(`#customer`);
    animateFade(div, 0.3);
    if (event) { // passes up to Customer object
      setTimeout(() => {
        animateFadeForAction(subdiv, () => {
          this.dispatchEvent(
            new CustomEvent(event, {
              bubbles: true,
              detail: { result },
            })
          );
        });
      }, 100);
    };
  };

  // listing.reload dispatched by form-modal
  this.addEventListener("listing.reload", reLoad);

  /*
   * @function AttributeRow
   * Layout helper
   */
  const AttributeRow = ({ title, value }) => {
    return (
      <Fragment>
        <div class={`fl w-50 gray tr pr3 pv1${title.startsWith("Next") ? " b" : ""}`}>
          { title }:
        </div>
        <div class={`fl w-50 pv1${title.startsWith("Next") ? " b" : ""}`}>
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
          <AttributeRow title={ title } value={ value } />
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
   * Determine if pausable
   * Cannot pause if within timeframe of frequency
   */
  const isSkippable = () => {
    const now = new Date();
    const nextCharge = new Date(Date.parse(subscription.attributes.nextChargeDate));
    const diffDays = Math.ceil(Math.abs(nextCharge - now) / (1000 * 60 * 60 * 24));
    return diffDays <= subscription.attributes.days; //i.e. 7 or 14
  };

  /*
   * Determine if can be rescheduled
   * Cannot reschedule if it means going back to scheduled delivery date
   * which can happen on two week subscriptions and original order out in the future
   */
  const isUnSkippable = () => {
    console.log("last delivered", subscription.attributes.lastOrder.delivered);
    const ts = Date.parse(subscription.attributes.lastOrder.delivered);
    if (isNaN(ts)) return false; // can happen if the order is not completed
    const lastDeliveryDate = new Date(ts);
    const delivered = new Date(Date.parse(subscription.attributes.nextDeliveryDate));
    const diffDays = Math.ceil(Math.abs(delivered - lastDeliveryDate) / (1000 * 60 * 60 * 24));
    return diffDays > subscription.attributes.days; //i.e. 7 or 14
  };

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
      ["Next Order Date", subscription.attributes.nextChargeDate],
      ["Next Scheduled Delivery", subscription.attributes.nextDeliveryDate],
      ["Frequency", subscription.attributes.frequency],
      //["Order Delivered", subscription.attributes.lastOrder.delivered],
      ["Subscription ID", subscription.attributes.subscription_id],
    ];
    if (Boolean(subscription.attributes.lastOrder)
      && Object.hasOwnProperty.call(subscription.attributes.lastOrder, "order_number")) {
      data.push(
        ["Last Order", `#${subscription.attributes.lastOrder.order_number}`],
      );
    };
    return data;
  };

  /*
   * @function getLogs
   * Fetch recent logs for this subscription
   */
  const getLogs = async () => {
    const { customer, subscription_id } = subscription.attributes;
    const uri = `/api/customer-logs?customer_id=${customer.id}&subscription_id=${subscription_id}`;
    return Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
          return null;
        };
        // ensure distinct on timestamp (later fixed)
        const logs = [];
        const map = new Map();
        for (const item of json.logs) {
          if(!map.has(item.timestamp)){
            map.set(item.timestamp, true);    // set any value to Map
            logs.push({
              timestamp: item.timestamp,
              message: item.message
            });
          };
        };
        subscriptionLogs = json.logs;
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
        return null;
      });
    return;
  };

  getLogs();

  const formatCount = (count) => {
    if (count === 1) return `${count}st`;
    if (count === 2) return `${count}nd`;
    if (count === 3) return `${count}rd`;
    return `${count}th`;
  };

  for await ({ subscription, idx, allowEdits, admin } of this) { // eslint-disable-line no-unused-vars

    yield (
      <Fragment>
        <h6 class="tl mb0 w-100 fg-streamside-maroon">
          {subscription.box.shopify_title} - {subscription.attributes.variant}
        </h6>
        { !subscription.attributes.hasNextBox && (
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
            <div class="fl w-30">
              <LogsModal logs={ subscriptionLogs }
                  box_title={ `${subscription.box.shopify_title} - ${subscription.attributes.variant}` } />
              <Button type="success-reverse"
                onclick={reloadCharge}
                title="Reload"
              >
                <span class="b">
                  Reload
                </span>
              </Button>
            </div>
            <div class="fl w-70 tr">
              { ( allowEdits && !editsPending ) && collapsed && (
                <Fragment>
                  { isSkippable() === true ? (
                    <SkipChargeModal subscription={ subscription } />
                  ) : (
                    isUnSkippable() === true && (
                      <UnSkipChargeModal subscription={ subscription } />
                    )
                  )}
                  <CancelSubscriptionModal subscription={ subscription } />
                </Fragment>
              )}
              <Button type="success-reverse"
                onclick={toggleCollapse}
                title={ collapsed ? (subscription.attributes.hasNextBox && !editsPending ? "Edit products" : "Show products") : "Hide products" }
              >
                <span class="b">
                  { collapsed ? (subscription.attributes.hasNextBox && !editsPending ? "Edit products" : "Show products") : "Hide products" }
                </span>
              </Button>
            </div>
          </div>
        )}
        { !subscription.attributes.hasNextBox && !collapsed && (
          <div class="dark-blue pa2 ma2 br3 ba b--dark-blue bg-washed-blue">
            <p class="">You will be able to edit your box products when the next box has been loaded.</p>
          </div>
        )}
        { (editsPending || subscription.attributes.pending) && (
          <div class="orange pv2 ma2 br3 ba b--orange bg-light-yellow">
            <p class="b">
              { subscription.attributes.pending ? (
                `Your subscription has updates pending. `
              ) : (
                `Your updates have been queued for saving. `
              )}
              This can take several minutes. Reloading subscription in 
              <div class="di w-2">
                <Timer seconds={ timerSeconds } callback={ reloadCharge } /> ...
              </div>
              { attempts ? ` ${formatCount(attempts)} attempt` : "" }
            </p>
          </div>
        )}
        { subscription.messages.length > 0 && subscription.attributes.hasNextBox && !subscription.attributes.pending && (
            <div class="dark-blue pv2 ma2 br3 ba b--dark-blue bg-washed-blue">
                <Fragment>
                  <ul class="">
                    { subscription.messages.map(el => <li>{el}</li>) }
                  </ul>
                  { subscription.attributes.nowAvailableAsAddOns.length > 0 && (
                    <p class="pl5">New available this week: { subscription.attributes.nowAvailableAsAddOns.join(", ") }</p>
                  )}
                  <div class="tr mv2 mr3">
                    <Button type="primary-reverse"
                      title="Continue"
                      onclick={() => saveChanges("updates")}>
                      <span class="b">
                        Continue
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
                  type="transparent/dark">
                  Cancel
                </Button>
              </div>
              <div class="dib pr2" id="saveEdits">
                <Button
                  onclick={ saveEdits }
                  hover="dim"
                  border="navy"
                  type="primary">
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div class="mb2 bb b--black-80">
          { ( allowEdits ) && (
            <div id={ `products-${idx}` }>
              <CollapsibleProducts
                collapsed={ collapsed }
                properties={ subscription.properties }
                box={ subscription.box }
                images={ subscription.attributes.images }
                nextChargeDate={ subscription.attributes.nextChargeDate }
                isEditable={ subscription.attributes.hasNextBox && !editsPending }
                key={ idx }
                id={ `subscription-${idx}` }
              />
            </div>
          )}
        </div>
      </Fragment>
    )
  };
};

export default Subscription;
