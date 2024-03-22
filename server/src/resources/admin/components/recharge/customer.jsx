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
  delay,
  sleepUntil,
  displayMessages,
  pluralize,
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
  if (Object.hasOwn(customer, "shopify_id")) {
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
  let loadingLabelDefault = `Loading current subscriptions`;
  const makeLoadingLabelDefault = (customer) => {
    loadingLabelDefault = `Loading current subscriptions for ${customer.first_name} ${customer.last_name}`;
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
   * Created a new subscription - lets flag it as new
   *
   * @member {object} newSubscriptionID
   */
  let newSubscriptionID = null;
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
  const sortChargeGroups = () => {
    chargeGroups.sort((a, b) => {
      let dateA = new Date(Date.parse(a.attributes.nextChargeDate));
      let dateB = new Date(Date.parse(b.attributes.nextChargeDate));
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;
      return 0;
    });
  };

  /**
   *
   * @function getChargeGroups
   * Get charges for customer
   *
   */
  const getChargeGroups = async (customer_id) => {
    let uri = `/api/recharge-customer-charges/${customer_id}`;
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
          // also need to disable events on the effected subscriptions!
          brokenSubscriptions = [...date_mismatch, ...orphans, ...price_mismatch, ...count_mismatch].map(el => el.box_subscription_id);
        };
        if (Object.hasOwnProperty.call(json, "result")) {
          chargeGroups = json.result;
          originalChargeGroups = cloneDeep(json.result);
        };
        loading = false;
        this.refresh();
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
  const getCancelledGroups = async (customer_id) => {
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
        loading = false;
        loadingLabel = loadingLabelDefault;
        this.refresh();
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
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
  const addingSubscription = (ev) => {
    if (ev.detail.src === "/api/recharge-add-box") {
      let subscription_ids = [ ...chargeGroups.map(el => el.attributes.subscription_id), ...cancelledGroups.map(el => el.box.id) ];
      // get the messages from ev?
      for (const id of subscription_ids) {
        const div = document.querySelector(`#subscription-${id}`);
        div.classList.add("disableevents");
      };
      const messages = document.getElementById(`saveMessages-${customer.id}`);
      if (messages) messages.classList.remove("closed");
      const display = document.getElementById(`displayMessages-${customer.id}`);
      if (display && Object.hasOwn(ev.detail.json, "messages")) {
        displayMessages(display, ev.detail.json.messages);
      };
    };
  };

  // listing.reload dispatched by form-modal
  this.addEventListener("listing.reload", addingSubscription);

  /**
   * Update charge groups and remove the deleted subscription
   * @function removeSubscription
   * @listen subscription.deleted event
   */
  const removeSubscription = (ev) => {
    const { subscription, subscription_id } = ev.detail
    const deleted = cancelledGroups.find(el => el.box.id === subscription_id);
    const idx = cancelledGroups.indexOf(deleted);
    cancelledGroups.splice(idx, 1);
    let subscription_ids = [ ...chargeGroups.map(el => el.attributes.subscription_id), ...cancelledGroups.map(el => el.box.id) ];
    for (const id of subscription_ids) {
      const div = document.querySelector(`#subscription-${id}`);
      div.classList.remove("disableevents");
    };
    const div = document.querySelector(`#customer-${rechargeCustomer.id}`);
    animateFadeForAction(div, async () => await this.refresh(), 800);
  };

  this.addEventListener("subscription.deleted", removeSubscription);

  /**
   * Move the reactivated subscription to chargeGroups
   * @function reactivateSubscription
   * @listen subscription.deleted event
   */
  const reactivateSubscription = async (ev) => {
    const { subscription, subscription_id } = ev.detail
    const cancelled = cancelledGroups.find(el => el.box.id === subscription_id);
    const idx = cancelledGroups.indexOf(cancelled);
    if (idx !== -1) { // oddly getting here twice???
      cancelledGroups.splice(idx, 1);
      chargeGroups.push(subscription);
      originalChargeGroups = cloneDeep(chargeGroups); // save for cancel event
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
  };

  this.addEventListener("subscription.reactivated", reactivateSubscription);

  /**
   * Move the cancelled subscription to cancelledGroups
   * @function cancelSubscription
   * @listen subscription.cancelled event
   */
  const cancelSubscription = async (ev) => {
    const { subscription, subscription_id } = ev.detail
    const charge = chargeGroups.find(el => el.attributes.subscription_id === subscription_id);
    const idx = chargeGroups.indexOf(charge);
    chargeGroups.splice(idx, 1);
    originalChargeGroups = cloneDeep(chargeGroups); // save for cancel event
    cancelledGroups.push(subscription);
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

  this.addEventListener("subscription.cancelled", cancelSubscription);

  /**
   * Load the new subscription after it was created
   * @function createSubscription
   * @listen subscription.created event
   */
  const createSubscription = async (ev) => {
    const { subscription_id } = ev.detail
    newSubscriptionID = subscription_id;

    setTimeout(async () => {
      const socketMessages = document.getElementById(`addBoxMessages-${customer.id}`);
      const saveMessages = document.getElementById(`saveMessages-${customer.id}`);
      if (socketMessages) {
        socketMessages.classList.add("closed"); // uses css transitions
      };
      if (saveMessages) {
        saveMessages.classList.add("closed"); // uses css transitions
      };
      loading = true;
      chargeGroups = [];
      this.refresh();
      await getChargeGroups(customer.id).then(async (result) => {
        this.refresh();
      });
    }, 1000);

  };

  window.addEventListener("subscription.created", createSubscription);

  /**
   * Disable all events on subscription objects not including the current
   * @function disableEvents
   * @listen subscription.editing event
   */
  const disableEvents = async (ev) => {
    const { subscription_id } = ev.detail;
    const mydiv = document.querySelector(`#subscription-${subscription_id}`);
    if (mydiv) {
      mydiv.classList.remove("disableevents");
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
    const { subscription_id } = ev.detail;
    let subscription_ids = [ ...chargeGroups.map(el => el.attributes.subscription_id), ...cancelledGroups.map(el => el.box.id) ];
    subscription_ids = subscription_ids.filter(el => el !== subscription_id);
    for (const id of subscription_ids) {
      const div = document.querySelector(`#subscription-${id}`);
      div.classList.remove("disableevents");
    };
  };

  this.addEventListener("customer.enableevents", enableEvents);

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

    setTimeout(() => {
      loading = false;
      chargeGroups = cloneDeep(originalChargeGroups);
      const div = document.querySelector(`#customer-${rechargeCustomer.id}`);
      animateFadeForAction(div, async () => await this.refresh(), 300);
    }, 400);
  };

  /**
   *
   * Initiate and retrieve data
   * If this through the customer portal then we don't yet have a recharge customer object
   *
   */
  const init = async (data) => {

    if (Object.hasOwn(data, "session_id")) {
      loadingSession = data.session_id;
      loading = true;
      await this.refresh();
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
          if (!charge) {
            makeLoadingLabelDefault(customer); 
            loadingLabel = loadingLabelDefault;
            this.refresh();
            getChargeGroups(res.id).then(async (result) => {
              loadingLabel = loadingLabelDefault.replace("current", "cancelled");;
              this.refresh();
              await getCancelledGroups(res.id);
            });
          };
        };
      });
    } else {
      rechargeCustomer = customer;
      if (!charge) {
        await getChargeGroups(customer.id).then(async (result) => {
          loadingLabel = loadingLabelDefault.replace("current", "cancelled");;
          this.refresh();
          await getCancelledGroups(customer.id);
        });
      };
    };
    if (charge) { // passed in as props from customers.jsx
      chargeGroups = charge.groups;
      originalChargeGroups = cloneDeep(charge.groups);
      if (charge.errors) {
        errors = true;
        date_mismatch = charge.errors.date_mismatch;
        count_mismatch = charge.errors.count_mismatch;
        price_mismatch = charge.errors.price_mismatch;
        orphans = charge.errors.orphans;
        // also need to disable events on the effected subscriptions!
        brokenSubscriptions = [...date_mismatch, ...orphans, ...price_mismatch, ...count_mismatch].map(el => el.box_subscription_id);
      };
      loading = false;
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

  const loadingSocketClosed = async (ev) => {
    //ev.stopImmediatePropagation(); // caused Subscription to miss out?
    if (loadingSession === ev.detail.session_id) {
      await sleepUntil(() => document.getElementById(`loadMessages-${shopify_customer_id}`), 800)
        .then((res) => {
          console.log(res);
          animateFadeForAction(res, () => res.classList.add("dn"), 400);
          loadingSession = null;
          this.refresh();
        }).catch((e) => {
          console.log("error", e);
          // no need for action
        });
    };
  };

  window.addEventListener("socket.closed", loadingSocketClosed);

  const shopAdminUrl = `https://${ localStorage.getItem("shop") }/admin/customers`;
  const rechargeAdminUrl = `https://${ localStorage.getItem("recharge") }.admin.rechargeapps.com/merchant/customers`;

  //await init();
  if (charge) {
    await init({});
  } else {
    await getSessionId(init, {}, `loadMessages-${shopify_customer_id}`, this);
  };

  for await ({ customer, charge } of this) { // eslint-disable-line no-unused-vars

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
    } else if (!rechargeCustomer) {
      yield (
        <Fragment>
          { loading && <BarLoader /> }
        </Fragment>
      );
    } else if (rechargeCustomer) {
      yield (
        <div id="customer-wrapper" class="pr3 pl3 w-100">
          { loading && <BarLoader /> }
          { fetchError && <Error msg={fetchError} /> }
          <div id={ `loadMessages-${shopify_customer_id}` } class="tl socketMessages"></div>
          <div id={ `customer-${rechargeCustomer.id}` }>
            <Fragment>
              { loading && (
                <div class="alert-box dark-blue pv2 ph4 ma2 br3 ba b--dark-blue bg-washed-blue">
                  <p>
                    <i class="b">Hold tight.</i> { loadingLabel } ...
                  </p>
                </div>
              )}
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
                  <div class="w-100 flex-container mt0 pa0">
                    <AddBoxModal
                      subscription={ null }
                      customer={ rechargeCustomer }
                      admin={ admin }
                      type="created"
                      socketMessageId={ `addBoxMessages-${rechargeCustomer.id}` }/>
                    <button
                      class="b purple dib bg-white bg-animate hover-white hover-bg-purple w-20 pv2 outline-0 mv1 pointer b--navy bt bb br bl-0"
                      title="Verify"
                      type="button"
                      onclick={ async () => await verifyCustomerSubscriptions({ customer: rechargeCustomer }) }
                      >
                        <span class="v-mid di">Verify customer subscriptions</span>
                    </button>
                    <a
                      class="b link tc dark-green dib bg-white bg-animate hover-white hover-bg-dark-green w-20 pv2 outline-0 mv1 pointer b--navy bt bb br bl-0"
                      title="Shopify"
                      type="button"
                      target="_blank"
                      href={ `${shopAdminUrl}/${rechargeCustomer.external_customer_id.ecommerce}` }
                      >
                        <span class="v-mid di">View customer in Shopify</span>
                    </a>
                    <a
                      class="b link tc green dib bg-white bg-animate hover-white hover-bg-green w-20 pv2 outline-0 mv1 pointer b--navy bt bb br bl-0"
                      title="Recharge"
                      type="button"
                      target="_blank"
                      href={ `${rechargeAdminUrl}/${rechargeCustomer.id}` }
                      >
                        <span class="v-mid di">View customer in Recharge</span>
                    </a>
                    <button
                      class="b dark-gray dib bg-white bg-animate hover-white hover-bg-gray w-20 pv2 outline-0 mv1 pointer b--navy bt bb br bl-0 br2 br--right"
                      title="New Customer"
                      type="button"
                      onclick={ getNewCustomer }
                      >
                        <span class="v-mid di">Load another customer</span>
                    </button>
                  </div>
                  <div id={ `saveMessages-${rechargeCustomer.id}` } class="tl saveMessages closed">
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
              { chargeGroups && chargeGroups.length > 0 ? (
                <Fragment>
                  <h4 class="tc mv4 w-100 navy">
                    { charge ? `Subscriptions for charge #${charge.id}. Scheduled at ${charge.scheduled_at}` : "Active Subscriptions" }
                  </h4>
                  { chargeGroups.map((group, idx) => (
                    <div id={`subscription-${group.attributes.subscription_id}`} class="subscription">
                      <Subscription
                        subscription={ group } idx={ idx }
                        brokenSubscriptions={ brokenSubscriptions }
                        newSubscription={ group.attributes.subscription_id === newSubscriptionID }
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
                        <Cancelled subscription={ group } customer={ rechargeCustomer } idx={ idx } />
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
            </Fragment>
          </div>
        </div>
      )
    };
  };
};

export default Customer;
