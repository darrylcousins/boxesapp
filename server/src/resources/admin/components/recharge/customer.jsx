/**
 * Makes customer component
 *
 * @module app/recharge/customer
 * @exports Customer
 * @requires module:app/recharge/customer
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import cloneDeep from "lodash.clonedeep";
import Cancelled from "./cancelled";
import Subscription from "./subscription";
import Error from "../lib/error";
import { Fetch, PostFetch } from "../lib/fetch";
import BarLoader from "../lib/bar-loader";
import { loadAnotherCustomer } from "./events";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import DTable from "./dtable";
import AddBoxModal from "./add-box-modal";
import { getSessionId } from "../socket";
import { 
  animateFadeForAction,
  animationOptions,
  animateFade,
  delay,
  sleepUntil,
  displayMessages,
  pluralize,
  collapseElement,
  transitionElementHeight,
  findTimeTaken,
} from "../helpers";

/**
 * Customer
 *
 * @function
 * @param {object} props Props
 * @param {object} props.customer Recharge customer object
 * @param {object} props.charge Recharge charge object
 * @param {bool} props.admin Is this the admin or the customer?
 * @yields Element
 * @example
 * import {renderer} from '@b9g/crank/dom';
 * renderer.render(<Customer customer={customer} />, document.querySelector('#app'))
 *
 * If charge is provided then do not load all customer charges
 */
async function *Customer({ customer, charge, admin }) {

  /**
   * Hang on to the shopify_id of the customer
   *
   * @member {boolean} loading
   */
  let shopify_customer_id;
  let recharge_customer_id;
  if (Object.hasOwnProperty.call(customer, "external_customer_id")) {
    shopify_customer_id = customer.external_customer_id.ecommerce; // coming from simple customer object in admin/customers.js
  } else {
    shopify_customer_id = customer.id; // customer portal in shopify
  };
  /**
   * True while loading data from api
   *
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * Label which is being loaded
   *
   * @member {string} loadingLabel, current or cancelled
   */
  let loadingLabelDefault = `Loading subscriptions`;
  const makeLoadingLabelDefault = (customer) => {
    loadingLabelDefault = `Loading subscriptions for ${customer.first_name} ${customer.last_name}`;
  };
  let loadingLabel = loadingLabelDefault;
  /**
   * Hang to the loading session_id
   *
   * @member {string} session_id
   */
  let loadingSession;
  /**
   * Messages received from api customer-charges
   *
   * @member {string} messages
   */
  let messages = "";
  /**
   * Messages received from api customer-charges
   *
   * @member {array} messages
   */
  let errors = false;
  /**
   * Fetch errors
   *
   * @member {boolean} fetchError
   */
  let fetchError = false;
  /**
   * timer
   *
   * @member {object} Keeping a track of how long updated take
   */
  let timer = null;
  /**
   * recharge customer fetched from api
   *
   * @member {object} recharge customer
   */
  let rechargeCustomer = {};
  /**
   * charge groups fetched from api
   *
   * @member {array} charge groups for the customer
   */
  let chargeGroups = [];
  /**
   * cancelled groups fetched from api
   *
   * @member {array} cancelled subscriptions for the customer
   */
  let cancelledGroups = [];
  /**
   * charge groups fetched from api
   *
   * @member {array} charge groups for the customer
   */
  let originalChargeGroups = [];
  /**
   * The list of charge dates used by the add box modal
   *
   * @member {array} charge dates for the customer
   */
  let chargeDates = [];
  /**
   * Orphans for this customer as fetched by 'verify subscriptions'
   *
   * @member {object} orphaned subscriptions for the customer
   */
  let orphans = [];
  /**
   * Date mismatches for this customer as fetched by 'verify subscriptions'
   *
   * @member {object} date mismatched subscriptions for the customer
   */
  let date_mismatch = [];
  /**
   * Count mismatches for this customer as fetched by 'verify subscriptions'
   *
   * @member {object} date mismatched subscriptions for the customer
   */
  let count_mismatch = [];
  /**
   * Price mismatches for this customer as fetched by 'verify subscriptions'
   *
   * @member {object} Price mismatched subscriptions for the customer
   */
  let price_mismatch = [];
  /**
   * Flagging the changed or created subscription
   *
   * @member {object} completedAction
   */
  let completedAction = {id: null, action: null};
  /**
   * Broken box ids turning up in verify subscriptions
   * Passed to Subscription which will add class disableevents
   *
   * @member {object} brokenSubscriptions
   */
  let brokenSubscriptions = [];
  /**
   * Hang on to the price table for reloading an updated subscription
   *
   * @member {object} price_table
   */
  let price_table = [];
  /**
   * Hang on to the address table for reloading an updated subscription
   *
   * @member {object} price_table
   */
  let address_table = [];

  /**
   * Return to customer search
   *
   * @function getNewCustomer
   */
  const getNewCustomer = () => {
    this.dispatchEvent(
      new CustomEvent("loadAnotherCustomer", {
        bubbles: true,
        detail: {}
      }));
  };

  /**
   * @function sortChargeGroups
   * Sort groups by next_scheduled_at
   *
   */
  const chargeGroupSort = (a, b) => {
    let dateA = new Date(Date.parse(a.attributes.nextChargeDate));
    let dateB = new Date(Date.parse(b.attributes.nextChargeDate));
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    return 0;
  };

  /**
   *
   * @function getChargeGroups
   * Get charges for customer
   *
   */
  const getChargeGroups = async (customer_id, detail) => {

    const headers = { "Content-Type": "application/json" };
    const data = {
      customer: rechargeCustomer,
      price_table,
      address_table,
      chargeGroups: originalChargeGroups.filter(el => el.attributes.subscription_id !== detail.subscription_id),
      subscription_ids: (detail.action !== "cancelled" && detail.includes) || [],
      detail,
    };
    let uri = `/api/recharge-customer-charges/${customer_id}`;
    console.log(detail);
    if (detail.action === "created" && data.subscription_ids.length === 0) {
      data.subscription_ids.push(detail.subscription_id); // only load the created subscription
    };
    console.log(data);
    if (loadingSession) uri = `${uri}/${loadingSession}`;
    return PostFetch({ src: encodeURI(uri), data, headers})
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
          return null;
        };
        if (Object.hasOwnProperty.call(json, "message")) {
          messages = json.message;
        } else {
          messages = []
        };
        errors = Boolean(json.errors);
        if (errors) { // may be false
          date_mismatch = json.errors.date_mismatch;
          price_mismatch = json.errors.price_mismatch;
          count_mismatch = json.errors.count_mismatch;
          orphans = json.errors.orphans;
          // events are disabled for brokenSubscriptions
          brokenSubscriptions = [...date_mismatch, ...orphans, ...price_mismatch, ...count_mismatch].map(el => el.box_subscription_id);
        };
        if (Object.hasOwnProperty.call(json, "result")) {
          const dateSort = (a, b) => {
            const dateA = new Date(Date.parse(a.attributes.scheduled_at));
            const dateB = new Date(Date.parse(b.attributes.scheduled_at));
            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;
            return 0;
          };
          // sort by date
          chargeGroups = json.result.sort(dateSort)
          console.log(chargeGroups.filter(el => el.attributes.subscription_id !== detail.subscription_id));
 
          // get a list of scheduled_at to pass to change box modal
          chargeDates = Array.from(new Set(chargeGroups.map(el => new Date(el.attributes.scheduled_at))));
          originalChargeGroups = cloneDeep(chargeGroups);
          if (detail && !["cancelled", "deleted"].includes(detail.action)) {
            completedAction = { id: detail.subscription_id, action: detail.action };
            setTimeout(() => {
              const div = document.getElementById(`action-${detail.subscription_id}`);
              if (div) {
                animateFadeForAction(div, () => div.classList.add("dn"), 400);
                completedAction = { id: null, action: null };
                this.refresh();
              };
            }, 5000 + chargeGroups.length * 5000 );
          };
          price_table = json.price_table;
          address_table = json.address_table;
        };
        loading = false;
        // this.refresh(); refresh driven by socket.closed
        return true;
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
        return null;
      });
  };

  /**
   *
   * @function getCancelledGroups
   * Get cancelled subscriptions for customer grouped as for charges
   *
   */
  const getCancelledGroups = async (customer_id, detail) => {
    let uri = `/api/recharge-cancelled-subscriptions/${customer_id}`;
    if (loadingSession) uri = `${uri}?session_id=${loadingSession}`;
    return Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
          return null;
        };
        cancelledGroups = json;
        if (detail && detail.action === "cancelled") {
          completedAction = { id: detail.subscription_id, action: detail.action };
          setTimeout(() => {
            const div = document.getElementById(`action-${detail.subscription_id}`);
            if (div) {
              animateFadeForAction(div, () => div.classList.add("dn"), 400);
              completedAction = { id: null, action: null };
              this.refresh();
            };
          }, 10000);
        };
        loading = false;
        loadingLabel = loadingLabelDefault;
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  /**
   *
   * @function getCustomerCharge
   * Get a single charge - used by admin to speed up loading if only a single
   * charge needs to be viewed
   *
   */
  const getCustomerCharge = async (customer_id, charge) => {
    let uri = `/api/recharge-customer-charge/${customer_id}/${charge.scheduled_at}/${charge.address_id}`;
    if (loadingSession) uri = `${uri}?session_id=${loadingSession}`;
    return Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          loadingLabel = null;
          this.refresh();
          return null;
        };
        return json;
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
        return null;
      });
  };


  /**
   *
   * @function getRechargeCustomer
   * Get the recharge customer using shopify customer id
   *
   * Used is customer shopify portal where we only have shopify customer
   * Or from admin/customers.jsx if loading a single charge and using local db customer
   * Otherwise admin already has the customer from recharge
   */
  const getRechargeCustomer = async () => {
    let uri = `/api/recharge-customer?shopify_customer_id=${shopify_customer_id}`;
    if (loadingSession) uri = `${uri}&session_id=${loadingSession}`;
    return Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
          return null;
        };
        return json;
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
        return null;
      });

  };

  /**
   * disableevents on all subscriptions, they will be restored on subscription.created event
   * @function addingSubscription
   * @listen listing.reload event from addSubscription modal
   */
  const addingSubscription = async (ev) => {
    if (ev.detail.src === "/api/recharge-create-subscription") {
      let subscription_ids = [ ...chargeGroups.map(el => el.attributes.subscription_id), ...cancelledGroups.map(el => el.box.id) ];
      // start the timer
      timer = new Date();
      loadingSession = ev.detail.session_id;
      for (const id of subscription_ids) {
        const div = document.querySelector(`#subscription-${id}`);
        div.classList.add("disableevents");
      };
      await sleepUntil(() => document.getElementById(`displayMessages-${customer.id}`), 3000)
        .then((res) => {
          displayMessages(res, ev.detail.json.messages);
        }).catch((e) => {
          // no need for action
          console.log("found no div", e);
        });
    };
  };

  // listing.reload dispatched by form-modal
  this.addEventListener("listing.reload", addingSubscription);

  /**
   * Update charge groups and remove the deleted subscription
   * @function deleteSubscription
   * @listen subscription.deleted event
   */
  const deleteSubscription = async (subscription_id) => {
    const deleted = cancelledGroups.find(el => el.box.id === subscription_id);
    const idx = cancelledGroups.indexOf(deleted);
    cancelledGroups.splice(idx, 1);
    let subscription_ids = [ ...chargeGroups.map(el => el.attributes.subscription_id), ...cancelledGroups.map(el => el.box.id) ];
    for (const id of subscription_ids) {
      const div = document.querySelector(`#subscription-${id}`);
      div.classList.remove("disableevents");
    };
    await sleepUntil(() => document.getElementById(`customer-${rechargeCustomer.id}`), 500)
      .then((res) => {
        animateFadeForAction(res, async () => await this.refresh(), 400);
      }).catch((e) => {
        // no need for action
      });
  };

  /**
   * Disable all events on subscription objects not including the current
   * @function disableEvents
   * @listen subscription.editing event
   */
  const disableEvents = async (ev) => {
    ev.stopPropagation();
    let subscription_id;
    if (Object.hasOwnProperty.call(ev.detail, "subscription_id")) {
      subscription_id = ev.detail.subscription_id;
      const mydiv = document.querySelector(`#subscription-${subscription_id}`);
      if (mydiv) {
        mydiv.classList.remove("disableevents");
      };
    };
    let subscription_ids = [ ...chargeGroups.map(el => el.attributes.subscription_id), ...cancelledGroups.map(el => el.box.id) ];
    subscription_ids = subscription_ids.filter(el => el !== subscription_id);
    for (const id of subscription_ids) {
      const div = document.querySelector(`#subscription-${id}`);
      div.classList.add("disableevents");
    };
  };

  this.addEventListener("customer.disableevents", disableEvents);

  /**
   * Enable all events on subscription objects not including the current
   * @function enableEvents
   * @listen subscription.editing event
   */
  const enableEvents = async (ev) => {
    let subscription_id;
    if (ev) {
      ev.stopPropagation();
      if (Object.hasOwnProperty.call(ev.detail, "subscription_id")) {
        subscription_id = ev.detail.subscription_id;
        const mydiv = document.querySelector(`#subscription-${subscription_id}`);
        if (mydiv) {
          mydiv.classList.remove("enableevents");
        };
      };
    };
    let subscription_ids = [ ...chargeGroups.map(el => el.attributes.subscription_id), ...cancelledGroups.map(el => el.box.id) ];
    subscription_ids = subscription_ids.filter(el => el !== subscription_id);
    for (const id of subscription_ids) {
      const div = document.querySelector(`#subscription-${id}`);
      div.classList.remove("disableevents");
    };
  };

  this.addEventListener("customer.enableevents", enableEvents);

  const loadingSocketClosed = async (ev) => {
    if (loadingSession !== ev.detail.session_id) return;
    ev.stopPropagation(); // caused Subscription to miss out?

    const loader = document.getElementById(`loadMessages-${shopify_customer_id}`);
    // shouldn't need to sleep now because not refreshing on load customer and charges
    setTimeout(async () => {
      if (loader) loader.classList.add("closed");
      loadingSession = null;
      await delay(1800); // wait for loader to close
      await this.refresh();
      await delay(600); // wait for refresh to complete

      // if updated I've lost these somewhere so I'm doing this here though it
      // *just* works for the other actions - which (as a clue) are all modal driven
      if (completedAction.action === "updated") {
        const idx = chargeGroups.indexOf(chargeGroups.find(el => el.attributes.subscription_id === completedAction.id));
        const saveMessages = document.getElementById(`saveMessages-${completedAction.id }`);
        if (saveMessages) saveMessages.classList.add("dn");
        document.getElementById(`products-${completedAction.id}-${idx}`).classList.remove("disableevents");
        document.getElementById(`buttons-${completedAction.id}-${idx}`).classList.remove("disableevents");
      };
      await delay(300); // wait for refresh to complete
      await sleepUntil(() => document.getElementById(`customer-${shopify_customer_id}`), 500)
        .then(async (res) => {
          res.style.height = "auto";
          animateFade(`subscriptions-${shopify_customer_id}`, 1);
        }).catch(e => {
          console.log(e);
        });
    }, 800);
  };

  window.addEventListener("socket.closed", loadingSocketClosed);

  /**
   * @function updatesComplete
   * @listen window updates.completed event
   * @listen subscription.updates.completed event
   */
  const updatesComplete = async (ev) => {

    ev.stopPropagation(); // caused Subscription to miss out?
    loadingSession = ev.detail.session_id;
    const userActions = ["reconciled", "updated", "changed", "paused", "rescheduled", "cancelled", "reactivated", "deleted", "created"];

    console.log(ev.detail);
    if (ev.detail.action === "deleted") {
      // remove from cancelledGroups
      deleteSubscription(ev.detail.subscription_id);
      return;
    };
    if (timer) {
      const timeTaken = findTimeTaken(timer);
      timer = null;
      this.dispatchEvent(toastEvent({
        notice: `Updates (${ev.detail.action}) completed after ${timeTaken}` ,
        bgColour: "black",
        borderColour: "black"
      }));

      this.dispatchEvent(toastEvent({
        notice: `Subscription ${ev.detail.action}, reloading subscriptions.`,
        bgColour: "black",
        borderColour: "black"
      }));
    };
    setTimeout(async () => {
      const socketMessages = document.getElementById(`addBoxMessages-${customer.id}`);
      if (socketMessages) socketMessages.classList.remove("closed");
      await sleepUntil(() => document.getElementById(`customer-${shopify_customer_id}`), 500)
        .then(async (res) => {
          // maybe collapse it?
          const h = transitionElementHeight(res); // this sets the style height property
          collapseElement(res);
          delay(3000);
          if (charge) {
            // NOTE here we send admin back to customer listing because pausing
            // and rescheduling will push the subscription out of this charge
            this.dispatchEvent(
              new CustomEvent("loadAnotherCustomer", {
                bubbles: true,
                detail: {customer_id: customer.id}, // this is the recharge id
              }));
          } else {
            await getSessionId(init, {reload: true, detail: ev.detail}, `loadMessages-${shopify_customer_id}`, this);
          };
        }).catch((e) => {
          console.warn(e);
          // no need for action
        });
    }, 500);

  };

  window.addEventListener("created.complete", updatesComplete);
  this.addEventListener("subscription.updates.completed", updatesComplete);

  /**
   * For reloading and cancelling changes
   * Simple reverts all changes to originalChargeGroups
   *
   */
  const reloadCharge = (ev) => {
    chargeGroups = []
    loading = true;
    const div = document.querySelector(`#customer-${rechargeCustomer.id}`);
    //animateFadeForAction(div, async () => await this.refresh(), 300);

    console.log(ev.detail);
    setTimeout(async () => {
      loading = false;
      chargeGroups = cloneDeep(originalChargeGroups);
      chargeDates = Array.from(new Set(chargeGroups.map(el => new Date(el.attributes.scheduled_at))));
      await sleepUntil(() => document.getElementById(`customer-${rechargeCustomer.id}`), 500)
        .then((res) => {
          animateFadeForAction(res, async () => await this.refresh(), 400);
        }).catch((e) => {
          // no need for action
        });
    }, 400);
  };

  this.addEventListener("customer.reload", reloadCharge);
  /**
   *
   * Initiate and retrieve data
   * If this through the customer portal then we don't yet have a recharge customer object
   *
   */
  const init = async (data) => {

    chargeGroups = [];
    cancelledGroups = [];

    if (Object.hasOwnProperty.call(data, "reload")) { // if reloading
      loadingLabel = "Reloading and verifying changes ...";
    };

    if (Object.hasOwnProperty.call(data, "session_id")) {
      loadingSession = data.session_id;
      loading = true;
    };
    await this.refresh();

    if (Object.hasOwnProperty.call(data, "charge")) {
      await getCustomerCharge(rechargeCustomer.id, data.charge).then(json => {
        if (json) {
          if (json.errors) {
            date_mismatch = json.errors.date_mismatch;
            count_mismatch = json.errors.count_mismatch;
            price_mismatch = json.errors.price_mismatch;
            orphans = json.errors.orphans;
          };
          chargeGroups = json.subscriptions;
          chargeDates = Array.from(new Set(chargeGroups.map(el => new Date(el.attributes.scheduled_at))));
          originalChargeGroups = cloneDeep(json.charge.groups);
          loading = false;
          this.refresh();
        };
      });
      return;
    };

    let detail = {};
    if (Object.hasOwnProperty.call(data, "detail")) {
      detail = data.detail;
    };
    if (!Object.hasOwnProperty.call(customer, "external_customer_id")) {
      await getRechargeCustomer().then(res => {
        if (res) {
          console.log(res);
          rechargeCustomer = res;
          if (!Object.hasOwnProperty.call(customer, "email")) {
            // in customer portal we only have the shopify customer id
            customer.email = rechargeCustomer.email;
            customer.first_name = rechargeCustomer.first_name;
            customer.last_name = rechargeCustomer.last_name;
          };
          makeLoadingLabelDefault(customer); 
          loadingLabel = loadingLabelDefault;
          this.refresh();
          getChargeGroups(res.id, detail).then(async (result) => {
            loadingLabel = loadingLabelDefault.replace("current", "cancelled");;
            this.refresh();
            await getCancelledGroups(res.id, detail);
          });
        };
      });
    } else {
      rechargeCustomer = customer;
      await getChargeGroups(customer.id, detail).then(async (result) => {
        await getCancelledGroups(customer.id, detail);
      });
    };
  };

  /**
   * Run the subscription verification script
   *
   * @function verifyCustomerSubscriptions
   */
  const verifyCustomerSubscriptions = async ( { customer } ) => {
    let src = `/api/recharge-verify-customer-subscriptions`;
    fetchError = false;
    loading = true;
    loadingLabel = `Verifying all subscriptions for ${customer.first_name} ${customer.last_name}`;
    await this.refresh();
    
    const headers = { "Content-Type": "application/json" };
    const data = {
      customer: { recharge_id: customer.id }
    };
    await PostFetch({ src, data, headers })
      .then(async (result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          loadingLabel = loadingLabelDefault;
          this.refresh();
        } else {

          if (Object.hasOwnProperty.call(json, "verified")) {
            // passed verification
            this.dispatchEvent(toastEvent({
              notice: `Passed verification`,
              bgColour: "black",
              borderColour: "black"
            }));
            errors = false;
            orphans = [];
            date_mismatch = [];
            count_mismatch = [];
            price_mismatch = [];
          } else {
            // failed to verify, update orphans and date_mismatches
            this.dispatchEvent(toastEvent({
              notice: `Failed verification`,
              bgColour: "black",
              borderColour: "black"
            }));
            // display a report
            errors = true;
            orphans = json.orphans;
            date_mismatch = json.date_mismatch;
            count_mismatch = json.count_mismatch;
            price_mismatch = json.price_mismatch;
            brokenSubscriptions = [...date_mismatch, ...orphans, ...price_mismatch, ...count_mismatch].map(el => el.box_subscription_id);
          };
          loadingLabel = loadingLabelDefault;
          loading = false;
          await this.refresh();

          if (Object.hasOwnProperty.call(json, "verified")) {
            delay(300); // wait for refresh
            enableEvents();
          };
        }
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  const shopAdminUrl = `https://${ localStorage.getItem("shop") }/admin/customers`;
  const rechargeAdminUrl = `https://${ localStorage.getItem("recharge") }.admin.rechargeapps.com/merchant/customers`;

  if (charge) {
    // always passed a recharge customer in this case
    rechargeCustomer = customer;
    await getSessionId(init, { charge }, `loadMessages-${shopify_customer_id}`, this);
  } else {
    chargeGroups = [];
    await getSessionId(init, {  }, `loadMessages-${shopify_customer_id}`, this);
  };

  for await ({ customer, charge } of this) { // eslint-disable-line no-unused-vars

    if (Object.keys(rechargeCustomer).length > 0 && (rechargeCustomer.has_payment_method_in_dunning || !rechargeCustomer.has_valid_payment_method)) {
      yield (
        <Fragment>
          <div class="alert-box navy mv2 pa4 br3 ba b--navy bg-washed-blue">
            Ooops! It appears that we do not have a valid payment method to {" "}
            bill a new box subscription to or perhaps another charge has {" "}
            recently failed.<br />
            Please contact {" "}
            <a class="link b navy"
              href={ `mailto://${localStorage.getItem("admin_email")}?subject=${localStorage.getItem("email_subject")}` }
            >{ localStorage.getItem("shop_title") }</a> {" "}
            to address this problem.
          </div>
        </Fragment>
      );
    } else {
      yield (
        <div id="customer-wrapper" class="pr3 pl3 w-100">
          { loading && <BarLoader /> }
          { fetchError && <Error msg={fetchError} /> }
          { loading && (
            <div class="alert-box dark-blue pv2 ph4 ma2 br3 ba b--dark-blue bg-washed-blue">
              <p>
                <i class="b">Hold tight.</i> { loadingLabel } ...
              </p>
            </div>
          )}
          { loadingSession && (
            <div id={ `loadMessages-${shopify_customer_id}` } class="tl socketMessages collapsible"></div>
          )}
          <div id={ `customer-${shopify_customer_id}` } class="collapsible">
            <Fragment>
              { rechargeCustomer && (
                <Fragment>
                  { !admin && !loading && (
                    <div class="w-100 tr">
                      <AddBoxModal
                        subscription={ null }
                        customer={ rechargeCustomer }
                        admin={ admin }
                        type="created"
                        chargeDates={ chargeDates }
                        socketMessageId={ `addBoxMessages-${rechargeCustomer.id}` }/>
                    </div>
                  )}
                  { admin && !loading && (
                    <Fragment>
                      <div class="w-100 flex-container mt0 pa0 pr1">
                        <AddBoxModal
                          subscription={ null }
                          customer={ rechargeCustomer }
                          admin={ admin }
                          type="created"
                          chargeDates={ chargeDates }
                          socketMessageId={ `addBoxMessages-${rechargeCustomer.id}` }/>
                        <button
                          class="w-100 b purple dib bg-white bg-animate hover-white hover-bg-purple w-20 pv2 outline-0 ml1 mv1 pointer b--navy ba"
                          title="Verify"
                          type="button"
                          onclick={ async () => await verifyCustomerSubscriptions({ customer: rechargeCustomer }) }
                          >
                            <span class="v-mid di">Verify customer subscriptions</span>
                        </button>
                        <a
                          class="w-100 b link tc dark-green dib bg-white bg-animate hover-white hover-bg-dark-green w-20 pv2 outline-0 ml1 mv1 pointer b--navy ba"
                          title="Shopify"
                          type="button"
                          target="_blank"
                          href={ `${shopAdminUrl}/${rechargeCustomer.external_customer_id.ecommerce}` }
                          >
                            <span class="v-mid di">View customer in Shopify</span>
                        </a>
                        <a
                          class="w-100 b link tc green dib bg-white bg-animate hover-white hover-bg-green w-20 pv2 outline-0 ml1 mv1 pointer b--navy ba"
                          title="Recharge"
                          type="button"
                          target="_blank"
                          href={ `${rechargeAdminUrl}/${rechargeCustomer.id}` }
                          >
                            <span class="v-mid di">View customer in Recharge</span>
                        </a>
                        <button
                          class="w-100 b dark-gray dib bg-white bg-animate hover-white hover-bg-gray w-20 pv2 outline-0 ml1 mv1 pointer b--navy ba br2 br--right"
                          title="New Customer"
                          type="button"
                          onclick={ getNewCustomer }
                          >
                            <span class="v-mid di">Load another customer</span>
                        </button>
                      </div>
                      <div id={ `saveMessages-${rechargeCustomer.id}` } class="tl w-100 saveMessages closed">
                        <div class="alert-box relative dark-blue pa2 ma2 br3 ba b--dark-blue bg-washed-blue">
                          <p id={ `displayMessages-${rechargeCustomer.id}` }  class="fg-streamside-blue"></p>
                        </div>
                      </div>
                      <div id={ `addBoxMessages-${rechargeCustomer.id}` } class="tl socketMessages"></div>
                      <div class="cf" />
                    </Fragment>
                  )}
                  { errors && (
                    <div class="alert-box relative dark-blue ph5 ma1 br3 ba b--dark-blue">
                      { admin ? (
                        <p>There are errors in this customer's subscriptions that will need action.</p>
                      ) : (
                        <p class="lh-copy b">
                          Ooops! There are errors in your subscription. Please contact the <a
                            class="b link hover-animate underline"
                            href={ `mailto:${localStorage.getItem("admin_email")}` }>shop administrator</a>
                        </p>
                      )}
                      { date_mismatch && date_mismatch.length > 0 && (
                        <DTable items={ date_mismatch } title="Date mismatches" show_title={ true } />
                      )}
                      { count_mismatch && count_mismatch.length > 0 && (
                        <DTable items={ count_mismatch } title="Count mismatches" show_title={ true } />
                      )}
                        <div class="cf" />
                      { orphans && orphans.length > 0 && (
                        <DTable items={ orphans } title="Orphaned items" show_title={ true } />
                      )}
                      <div class="cf" />
                      { price_mismatch && price_mismatch.length > 0 && (
                        <DTable items={ price_mismatch } title="Price mismatches" show_title={ true } />
                      )}
                    </div>
                  )}
                  { messages.length > 0 && (
                    <div class="alert-box dark-blue pa2 ma2 br3 ba b--dark-blue bg-washed-blue">
                        <p class="tc">{ messages }</p>
                    </div>
                  )}
                </Fragment>
              )}
              <div id={ `subscriptions-${shopify_customer_id}` } style="opacity: 0.1">
                { chargeGroups && chargeGroups.length > 0 ? (
                  <Fragment>
                    <h4 class="tc mv4 w-100 navy">
                      { charge ? `Subscriptions scheduled for ${charge.scheduled_at}` : "Active Subscriptions" }
                    </h4>
                    { chargeGroups.map((group, idx) => (
                      <div id={`customer-subscription-${group.attributes.subscription_id}`} class="subscription">
                        <Subscription
                          subscription={ group } idx={ idx }
                          brokenSubscriptions={ brokenSubscriptions }
                          completedAction={ group.attributes.subscription_id === completedAction.id ? completedAction.action : null }
                          customer={ rechargeCustomer }
                          admin={ admin }
                          crank-key={ `${group.attributes.nextChargeDate.replace(/ /g, "_")}-${idx}` }
                        />
                      </div>
                    ))}
                  </Fragment>
                ) : (
                  !loading && !charge && cancelledGroups && cancelledGroups.length === 0 && (
                    <div class="alert-box dark-blue pa2 ma2 br3 ba b--dark-blue bg-washed-blue">
                        <p class="tc">No cancelled subscriptions found.</p>
                    </div>
                  )
                )}
                { cancelledGroups && (
                  cancelledGroups.length > 0 ? (
                    <Fragment>
                      <h4 class="tc mv4 w-100 navy">
                        Cancelled Subscriptions
                      </h4>
                      { cancelledGroups.map((group, idx) => (
                        <div id={`subscription-${group.subscription_id}`} class="subscription">
                          <Cancelled
                            subscription={ group }
                            customer={ rechargeCustomer } idx={ idx }
                            completedAction={ group.subscription_id === completedAction.id ? completedAction.action : null }
                          />
                        </div>
                      ))}
                    </Fragment>
                  ) : (
                    <div class="w-100">
                      <div class="mw6 center pt3">
                        &nbsp;
                      </div>
                    </div>
                  )
                )}
              </div>
            </Fragment>
          </div>
        </div>
      )
    };
  };
};

export default Customer;
