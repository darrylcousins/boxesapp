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
async function *Customer({ customer, charge_id, admin }) {

  /**
   * Hang on to the shopify_id of the customer
   *
   * @member {boolean} loading
   */
  let shopify_customer_id;
  if (Object.hasOwnProperty.call(customer, "shopify_id")) {
    shopify_customer_id = customer.shopify_id; // coming from simple customer object in admin/customers.jsx
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
  let rechargeCustomer = null;
  /**
   * charge groups fetched from api
   *
   * @member {object} charge groups for the customer
   */
  let chargeGroups = [];
  /**
   * cancelled groups fetched from api
   *
   * @member {object} cancelled subscriptions for the customer
   */
  let cancelledGroups = [];
  /**
   * charge groups fetched from api
   *
   * @member {object} charge groups for the customer
   */
  let originalChargeGroups = [];
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
   * @member {object} updatedAction
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
   * Return to customer search
   *
   * @function getNewCustomer
   */
  const getNewCustomer = () => {
    this.dispatchEvent(loadAnotherCustomer());
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
    let uri = `/api/recharge-customer-charges/${shopify_customer_id}`;
    if (loadingSession) uri = `${uri}?session_id=${loadingSession}`;
    console.log("getting charge groups", uri);
    return Fetch(encodeURI(uri))
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
          chargeGroups = json.result;
          originalChargeGroups = cloneDeep(json.result);
          if (detail && !["cancelled", "deleted"].includes(detail.action)) {
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
  const getCustomerCharge = async (customer_id, charge_id) => {
    let uri = `/api/recharge-customer-charge/${customer_id}?charge_id=${charge_id}`;
    if (loadingSession) uri = `${uri}&session_id=${loadingSession}`;
    console.log("getting charge ofr customer", uri);
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
    console.log("getting recharge customer", uri);
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
    console.log("deleted", subscription_id);
    const deleted = cancelledGroups.find(el => el.box.id === subscription_id);
    const idx = cancelledGroups.indexOf(deleted);
    cancelledGroups.splice(idx, 1);
    console.log("found deleted", deleted, idx);
    let subscription_ids = [ ...chargeGroups.map(el => el.attributes.subscription_id), ...cancelledGroups.map(el => el.box.id) ];
    console.log("remaining", cancelledGroups);
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
    ev.stopPropagation();
    let subscription_id;
    if (Object.hasOwnProperty.call(ev.detail, "subscription_id")) {
      subscription_id = ev.detail.subscription_id;
      const mydiv = document.querySelector(`#subscription-${subscription_id}`);
      if (mydiv) {
        mydiv.classList.remove("enableevents");
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
    console.log(ev.detail);
    console.log(loadingSession);
    if (loadingSession !== ev.detail.session_id) return;
    ev.stopPropagation(); // caused Subscription to miss out?

    const loader = document.getElementById(`loadMessages-${shopify_customer_id}`);
    console.log("loadingSocketClosesd", ev.detail, "lodader?", Boolean(loader));
    console.log("loading socket closed", completedAction);
    // shouldn't need to sleep now because not refreshing on load customer and charges
    setTimeout(async () => {
      if (loader) loader.classList.add("closed");
      loadingSession = null;
      await delay(1900); // wait for loader to close
      await this.refresh();
      await delay(800); // wait for refresh to complete

      // if updated I've lost these somewhere so I'm doing this here though it
      // *just* works for the other actions - which (as a clue) are all modal driven
      if (completedAction.action === "updated") {
        const idx = chargeGroups.indexOf(chargeGroups.find(el => el.attributes.subscription_id === completedAction.id));
        console.log(idx);
        console.log("closing and enabling the subscription divs");
        const saveMessages = document.getElementById(`saveMessages-${completedAction.id }`);
        if (saveMessages) saveMessages.classList.add("dn");
        document.getElementById(`products-${completedAction.id}-${idx}`).classList.remove("disableevents");
        document.getElementById(`buttons-${completedAction.id}-${idx}`).classList.remove("disableevents");
      };
      await delay(300); // wait for refresh to complete
      await sleepUntil(() => document.getElementById(`customer-${customer.id}`), 500)
        .then(async (res) => {
          res.style.height = "auto";
          animateFade(`subscriptions-${customer.id}`, 1);
        });
    }, 800);
  };

  window.addEventListener("socket.closed", loadingSocketClosed);

  /**
   * Load the new subscription after it was created
   * @function updatesComplete
   * @listen window updates.completed event
   * @listen subscription.updates.completed event
   */
  const updatesComplete = async (ev) => {

    console.log("customer", ev.detail);
    //if (ev.detail.action !== "created") return;

    ev.stopPropagation(); // caused Subscription to miss out?
    loadingSession = ev.detail.session_id;
    const userActions = ["reconciled", "updated", "changed", "paused", "rescheduled", "cancelled", "reactivated", "deleted", "created"];

    if (ev.detail.action === "deleted") {
      // remove from cancelledGroups
      deleteSubscription(ev.detail.subscription_id);
      return;
    };

    this.dispatchEvent(toastEvent({
      notice: `Subscription ${ev.detail.action}, reloading subscriptions.`,
      bgColour: "black",
      borderColour: "black"
    }));
    setTimeout(async () => {
      const socketMessages = document.getElementById(`addBoxMessages-${customer.id}`);
      if (socketMessages) socketMessages.classList.remove("closed");
      await sleepUntil(() => document.getElementById(`customer-${customer.id}`), 500)
        .then(async (res) => {
          console.log(res);
          // maybe collapse it?
          const h = transitionElementHeight(res); // this sets the style height property
          console.log(h);
          collapseElement(res);
          delay(3000);
          if (charge_id) {
            await getSessionId(init, {charge_id, reload: true, detail: ev.detail}, `loadMessages-${customer.id}`, this);
          } else {
            await getSessionId(init, {reload: true, detail: ev.detail}, `loadMessages-${customer.id}`, this);
          };
        }).catch((e) => {
          console.log("failed here");
          console.log(e);
          // no need for action
        });
    }, ["cancelled", "reactivated"].includes(ev.detail.action) ? 2500 : 500); // wait longer for moving between lists

  };

  window.addEventListener("created.complete", updatesComplete);
  this.addEventListener("subscription.updates.completed", updatesComplete);

  /**
   * For reloading and cancelling changes
   * Simple reverts all changes to originalChargeGroups
   *
   */
  const reloadCharge = (ev) => {
    console.log("custeomer.reload", ev);
    chargeGroups = []
    loading = true;
    const div = document.querySelector(`#customer-${rechargeCustomer.id}`);
    //animateFadeForAction(div, async () => await this.refresh(), 300);

    setTimeout(async () => {
      loading = false;
      chargeGroups = cloneDeep(originalChargeGroups);
      await sleepUntil(() => document.getElementById(`customer-${rechargeCustomer.id}`), 500)
        .then((res) => {
          console.log("wtf", res);
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
    originalChargeGroups = [];

    if (Object.hasOwnProperty.call(data, "reload")) { // if reloading
      loadingLabel = "Reloading and verifying changes ...";
    };

    if (Object.hasOwnProperty.call(data, "session_id")) {
      loadingSession = data.session_id;
      loading = true;
    };
    await this.refresh();

    /* Not required now that I'm emptying the charge lists
    if (Object.hasOwnProperty.call(data, "reload")) { // if reloading need to enable after loading
      delay(200); // let refresh complete
      this.dispatchEvent(
        new CustomEvent("customer.disableevents", {
          bubbles: true,
          detail: {},
        })
      );
      delay(200); // let disable complete
    };
    */

    if (Object.hasOwnProperty.call(data, "charge_id")) {
      await getCustomerCharge(rechargeCustomer.id, data.charge_id).then(json => {
        if (json) {
          if (json.errors) {
            date_mismatch = json.errors.date_mismatch;
            count_mismatch = json.errors.count_mismatch;
            price_mismatch = json.errors.price_mismatch;
            orphans = json.errors.orphans;
          };
          chargeGroups = json.subscriptions;
          console.log("loaded charge", chargeGroups);
          originalChargeGroups = cloneDeep(json.charge.groups);
          loading = false;
          this.refresh();
        };
      });
      return;
    };

    if (!Object.hasOwnProperty.call(customer, "external_customer_id")) {
      await getRechargeCustomer().then(res => {
        if (res) {
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
          getChargeGroups(res.id).then(async (result) => {
            loadingLabel = loadingLabelDefault.replace("current", "cancelled");;
            this.refresh();
            await getCancelledGroups(res.id);
          });
        };
      });
    } else {
      rechargeCustomer = customer;
      let detail = {};
      console.log(data);
      if (Object.hasOwnProperty.call(data, "detail")) {
        detail = data.detail;
      };
      await getChargeGroups(customer.id, detail).then(async (result) => {
        await getCancelledGroups(customer.id, detail);
      });
    };
    /* No longer needed after emptying charge lists
    if (Object.hasOwnProperty.call(data, "reload")) { // if reloading need to enable after loading
      this.dispatchEvent(
        new CustomEvent("customer.enableevents", {
          bubbles: true,
          detail: {},
        })
      );
    };
    */
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
            // No action required
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
          this.refresh();
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

  if (charge_id) {
    // always passed a recharge customer in this case
    rechargeCustomer = customer;
    await getSessionId(init, { charge_id }, `loadMessages-${shopify_customer_id}`, this);
  } else {
    chargeGroups = [];
    await getSessionId(init, {  }, `loadMessages-${shopify_customer_id}`, this);
  };

  for await ({ customer, charge_id } of this) { // eslint-disable-line no-unused-vars

    /*
    if (rechargeCustomer && (rechargeCustomer.has_payment_method_in_dunning || !rechargeCustomer.has_valid_payment_method)) {
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
    if (!rechargeCustomer) {
      yield (
        <Fragment>
          { loading && <BarLoader /> }
        </Fragment>
      );
    } else if (rechargeCustomer) {
      */
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
                    { charge_id ? `Subscriptions for charge #${charge_id}` : "Active Subscriptions" }
                  </h4>
                  { chargeGroups.map((group, idx) => (
                    <div id={`subscription-${group.attributes.subscription_id}`} class="subscription">
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
                !loading && !charge_id && cancelledGroups && cancelledGroups.length === 0 && (
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

export default Customer;
