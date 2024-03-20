/**
 * Creates element to render modal form to change box or variant
 *
 * @module app/components/recharge/change-box-modal
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @requires module:app/lib/icon-button~IconButton
 * @exports SkipChargeModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import Button from "../lib/button";
import FormModalWrapper from "../form/form-modal";
import Error from "../lib/error";
import BarLoader from "../lib/bar-loader";
import Form from "../form";
import { PostFetch, Fetch } from "../lib/fetch";
import CollapseWrapper from "../lib/collapse-animator";
import EditProducts from "../products/edit-products";
import {
  animateFadeForAction,
  formatDate,
  weekdays,
  findNextWeekday,
  dateStringSort,
  userNavigator,
  dateStringNow,
} from "../helpers";

/**
 * Helper method
 *
 * Takes the current delivery day string, the current variant weekday, and the
 * selected variant weekday and calculates a new delivery day, the new order
 * date, and the order_day_week value
 *
 * @function calculateDates
 * @returns { deliveryDate (obj), chargeDate (obj), orderDayOfWeek (int) }
 */
const calculateDates = (newVariant, currentDate, lastOrderDate) => {

  // need to figure what to do if no dates passed on add box

  const currentDeliveryDate = currentDate ? new Date(Date.parse(currentDate)) : new Date();
  const dayIdx = weekdays.map(el => el.toLowerCase()).indexOf(newVariant.toLowerCase());

  const deliveryDate = findNextWeekday(dayIdx, currentDeliveryDate);

  // dial it back a week, it will be corrected below if too early
  // mainly to try to pin a date which has an active box
  deliveryDate.setDate(deliveryDate.getDate() - 7);

  // don't have to go forward, but must keep later the lastOrder date a day or two of the charge date
  // lastOrderDate may be undefined, so make it infinitly in the past
  const lastOrderTime = lastOrderDate ? new Date(Date.parse(lastOrderDate)).getTime() : 0;

  /* Match "order_day_of_week" to 3 days before "Delivery Date"
   * "normal" weekdays in javascript are numbered Sunday = 0 but recharges uses Monday = 0
   * So to get our 3 days we'll subtract 4 days
   */
  let currentIdx = deliveryDate.getDay() - 4;
  if (currentIdx < 0) currentIdx = currentIdx + 7; // fix to ensure the future
  const orderDayOfWeek = currentIdx % 7;

  // with the delivery date we fix the next_charge_scheduled_at to 3 days prior
  //const offset = deliveryDate.getTimezoneOffset()
  //const chargeDate = new Date(deliveryDate.getTime() - (offset*60*1000));
  const chargeDate = new Date(deliveryDate);
  chargeDate.setDate(chargeDate.getDate() - 3);

  // finally a sanity check that the chargeDate is in the future and later than the last order
  const now = new Date();

  while (chargeDate.getTime() <= now.getTime() || chargeDate.getTime() <= lastOrderTime) {
    chargeDate.setDate(chargeDate.getDate() + 7);
    deliveryDate.setDate(deliveryDate.getDate() + 7);
  };

  // Put to the required yyyy-mm-dd format
  // Not returned, just testing
  // Could use .split("T")[0] instead of substring
  const nextChargeScheduledAt = formatDate(chargeDate);
  // does ISOString mess with things given timezone offset?

  return { deliveryDate, chargeDate, orderDayOfWeek };

};

/*
 * Helper method to sort variants
 */
const sortVariants = (o) => {
  const key = "title";
  o.sort((a, b) => {
    let intA = weekdays.indexOf(a[key]);
    let intB = weekdays.indexOf(b[key]);
    if (intA < intB) return -1;
    if (intA > intB) return 1;
    return 0;
  });
  return o;
};

/**
 * Icon component for link to expand modal
 *
 * @function ShowLink
 * @param {object} opts Options that are passed to {@link module:app/lib/icon-button~IconButton|IconButton}
 * @param {string} opts.name Name as identifier for the action
 * @param {string} opts.title Hover hint and hidden span
 * @param {string} opts.color Icon colour
 * @returns {Element} IconButton
 */
const ShowLink = (opts) => {
  const { name, title, color } = opts;
  return (
    <Button type="alt-primary-reverse" title="Change Box" name={name}>
      <span class="b">
        Change Box
      </span>
    </Button>
  );
};

/**
 * Options object passed to module:app/components/form-modal~FormModalWrapper
 *
 * @member {object} options
 */
const options = {
  id: "change-box", // form id - matches name in ShowLink which is title.toHandle
  title: "Change Box",
  color: "orange",
  src: "/api/recharge-change-box",
  ShowLink,
  saveMsg: "Updating subscription ... please be patient, it will take some minutes.",
  successMsg: "Updates have been queued, reloading ...",
  useSession: true, // set up socket.io to get feedback, requires passing a div id for messages
};

/**
 * Get the Container Box boxes
 *
 * @returns {object} Error (if any) and the boxes
 */
const getBoxes = async () => {
  return await Fetch("/api/get-store-boxes")
    .then(async (result) => {
      const { error, json } = result;
      return { error, boxes: json.boxes };
    })
    .catch((err) => {
      return { error: err, boxes: null};
    });
};

/**
 * Create a modal to change box product
 *
 * @generator
 * @yields {Element} A form and remove/cancel buttons.
 * @param {object} props Property object
 * @param {Function} props.doSave - The save action
 * @param {Function} props.closeModal - The cancel and close modal action
 * @param {string} props.title - Form title
 * @param {object} props.subscription - The subscription to be paused
 * @param {string} props.formId - The unique form indentifier
 */
async function* ChangeBox(props) {
  const { doSave, closeModal, title, type, customer, subscription, formId } = props;

  /**
   * Holds all the data
   *
   * @member {object} boxAttributes and others
   */
  console.log(customer);
  let boxAttributes = {};
  boxAttributes.customer = customer;
  if (subscription) { // may be a new box subscription
    boxAttributes = { ...subscription.attributes };
    boxAttributes.boxPlan = ""; // initialize
  };
  let currentBoxes;
  let currentBox;
  let currentVariants;
  let currentVariant;
  let currentPlans;
  let currentPlan;

  /**
   * the selected box on clicking preview
   *
   * @member {object} selectedBox
   */
  let selectedBox;
  /**
   * Properties for passing to EditProducts after reconcile box
   *
   * @member {object} boxProperties
   */
  let boxProperties;
  /**
   * Feedback to user
   *
   * @member {object} boxMessages
   */
  let alertMessage;
  /**
   * Messages after reconcile box
   *
   * @member {object} boxMessages
   */
  let boxMessages;
  /**
   * Delivery dates match so will need to reconcile the box before saving changes
   *
   * @member {object} boxMustReconcile
   */
  let boxMustReconcile;
  /**
   * True while loading data from api
   * Starts false until search term submitted
   *
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * True when customer agrees to subscription policy
   *
   * @member {boolean} checkedPolicy
   */
  let checkedPolicy = false;
  /**
   * The fetch error if any
   *
   * @member {object|string} fetchError
   */
  let fetchError = null;

  /**
   * Local save to perform actions before calling form-modal doSave
   *
   * @function thisSave
   * @returns {null}
   */
  const togglePolicy = async (ev) => {

    checkedPolicy = ev.target.checked;
    this.refresh();
  };

  /**
   * The initial data of the form
   *
   * @function getInitialData
   * @returns {object} The initial data for the form
   * returns the box else compiles reasonable defaults.
   */
  const getInitialData = () => {
    let data;
    if (currentBox && currentVariant && currentPlan) {
      data = {
        product_id: currentBox.id,
        variant_id: currentVariant.id,
        product_title: currentBox.title,
        variant_title: currentVariant.title,
        plan: JSON.stringify(currentPlan),
        price: currentVariant.price,
      };
    } else {
      data = {
        product_id: boxAttributes.product_id,
        variant_id: boxAttributes.variant_id,
        product_title: boxAttributes.title,
        variant_title: boxAttributes.variant,
        plan: boxAttributes.boxPlan,
        price: boxAttributes.boxPrice,
      };
    };
    //data.scheduled_at = new Date(Date.parse(boxAttributes.nextChargeDate)).toISOString().split('T')[0];
    data.scheduled_at = formatDate(new Date(Date.parse(boxAttributes.nextChargeDate)));
    data.delivery_date = boxAttributes.nextDeliveryDate;
    data.charge_id = boxAttributes.charge_id;
    data.address_id = boxAttributes.address_id;
    data.subscription_id = boxAttributes.subscription_id;
    data.order_day_of_week = boxAttributes.orderDayOfWeek;
    data.do_update = false;
    data.now = dateStringNow();
    data.type = type;
    data.navigator = userNavigator();
    data.admin = props.admin;
    data.customer = JSON.stringify(boxAttributes.customer);
    data.last_order = JSON.stringify(boxAttributes.lastOrder);
    data.properties = JSON.stringify(boxProperties);
    data.box = JSON.stringify(selectedBox);
    data.change_messages = JSON.stringify(boxMessages);

    return data;
  };

  /**
   * The form fields - required by {@link module:app/form/form~Form|Form}.
   *
   * @member {object} fields The form fields keyed by field title string
   */
  const getFields = () => {

    return {
      product_id: {
        type: "hidden",
        datatype: "string",
      },
      variant_id: {
        type: "hidden",
        datatype: "string",
      },
      product_title: {
        type: "hidden",
        datatype: "string",
      },
      variant_title: {
        type: "hidden",
        datatype: "string",
      },
      plan: {
        type: "hidden",
        datatype: "string",
      },
      price: {
        type: "hidden",
        datatype: "string",
      },
      scheduled_at: {
        type: "hidden",
        datatype: "string",
      },
      delivery_date: {
        type: "hidden",
        datatype: "string",
      },
      charge_id: {
        type: "hidden",
        datatype: "string",
      },
      address_id: {
        type: "hidden",
        datatype: "string",
      },
      subscription_id: {
        type: "hidden",
        datatype: "string",
      },
      order_day_of_week: {
        type: "hidden",
        datatype: "integer",
      },
      type: {
        type: "hidden",
        datatype: "string",
      },
      now: {
        type: "hidden",
        datatype: "string",
      },
      navigator: {
        type: "hidden",
        datatype: "string",
      },
      admin: {
        type: "hidden",
        datatype: "boolean",
      },
      schedule_only: { // indicates that only the delivery schedule has changed
        type: "hidden",
        datatype: "boolean",
      },
      schedule_changed: { // pass a flag of what has changed
        type: "hidden",
        datatype: "boolean",
      },
      product_changed: { // pass a flag of what has changed
        type: "hidden",
        datatype: "boolean",
      },
      variant_changed: { // pass a flag of what has changed
        type: "hidden",
        datatype: "boolean",
      },
      customer: {
        type: "hidden",
        datatype: "string",
      },
      last_order: {
        type: "hidden",
        datatype: "string",
      },
      properties: {
        type: "hidden",
        datatype: "string",
      },
      box: {
        type: "hidden",
        datatype: "string",
      },
      change_messages: {
        type: "hidden",
        datatype: "string",
      },
    };
  };

  /**
   * Local save to perform actions before calling form-modal doSave
   *
   * @function thisSave
   * @returns {null}
   */
  const thisSave = async () => {
    if (subscription) {
      this.dispatchEvent(
        new CustomEvent("customer.disableevents", {
          bubbles: true,
          detail: { subscription_id: boxAttributes.subscription_id },
        })
      );
    } else {
      await thisPreview(); // sets up box properties
    };

    let schedule_only = false;
    let schedule_changed = false;
    let product_changed = false;
    let variant_changed = false;

    let messages;
    if (subscription) {
      let final;
      messages = document.getElementById("change_messages").value;
      messages = JSON.parse(messages);
      if (currentPlan.name !== subscription.attributes.frequency) {
        schedule_changed = true;
        schedule_only = true;
        messages.unshift(`Delivery schedule changed from ${
          subscription.attributes.frequency.toLowerCase()} to ${currentPlan.name.toLowerCase()}.`);
      };
      const from = [];
      const to = [];
      if (currentBox.title !== subscription.attributes.title
        || currentVariant.title !== subscription.attributes.variant) {
        schedule_only = false;
        if (currentBox.title !== subscription.attributes.title) {
          product_changed = true;
          from.push(subscription.attributes.title);
          to.push(currentBox.title);
        };
        if (currentVariant.title !== subscription.attributes.variant) {
          variant_changed = true;
          from.push(subscription.attributes.variant);
          to.push(currentVariant.title);
        };
        if (from.length === 2) from.splice(1, 0, "-");
        if (to.length === 2) from.splice(1, 0, "-");
        final = ["Box subscription changed from", ...from, "to", ...to].join(" ");
      };
      if (final) messages.unshift(final);
    } else {
      messages = ["New subscription created"];
      document.getElementById("properties").value = JSON.stringify(boxProperties);
    };
    document.getElementById("change_messages").value = JSON.stringify(messages);
    document.getElementById("schedule_only").value = schedule_only;
    document.getElementById("schedule_changed").value = schedule_changed;
    document.getElementById("product_changed").value = product_changed;
    document.getElementById("variant_changed").value = variant_changed;
    this.dispatchEvent(
      new CustomEvent("subscription.messages", {
        bubbles: true,
        detail: { messages },
      })
    );
    doSave();
  };

  /**
   * Preview the box with the current included and add on products
   *
   * @function thisPreview
   * @returns {null}
   */
  const thisPreview = async () => {
    loading = true;
    this.refresh();

    let { error, json } = await Fetch(encodeURI(`/api/current-boxes-by-product/${currentBox.id}/${currentVariant.title.toLowerCase()}`))
      .then((result) => {
        return result;
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
          return null;
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

    if (error) {
      fetchError = error;
      loading = false;
      return this.refresh();
    };
    let foundDate = Object.keys(json).find(el => el === boxAttributes.nextDeliveryDate);

    // better would be to get by weekday date
    if (!foundDate) {
      foundDate = Object.keys(json).sort(dateStringSort).pop();
    };
    console.log("boxes by product", json);
    console.log("currentBox", currentBox);
    console.log("currentVariant", currentVariant);
    console.log("foundDate", foundDate);
    selectedBox = json[foundDate];

    console.log("selected box", selectedBox);
    const boxLists = {};
    if (subscription) {
      for (const [key, value] of Object.entries(subscription.properties)) {
        boxLists[key] = value.split(",").filter(el => el !== "");
      };
    } else {
      // for new subscription set other properties
      boxLists["Including"] = "";
      boxLists["Add on Items"] = "";
      boxLists["Swapped Items"] = "";
      boxLists["Removed Items"] = "";
    };
    boxLists["Delivery Date"] = boxAttributes.nextDeliveryDate;

    selectedBox.variant_id = currentVariant.id;
    selectedBox.variant_title = currentVariant.title;
    selectedBox.variant_name = `${currentBox.title} - ${currentVariant.title}`;;

    const headers = { "Content-Type": "application/json" };
    const data = { boxLists, box: selectedBox };
    const src = "/api/recharge-get-reconciled-preview";
    await PostFetch({ src, data, headers })
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          boxProperties = json.properties;
          // because a box is already uploaded for this delivery date it will need to reconciled
          boxMustReconcile = (
            boxProperties["Delivery Date"] === boxAttributes.nextDeliveryDate
          );
          boxProperties["Delivery Date"] = boxAttributes.nextDeliveryDate;
          boxMessages = json.messages;
          loading = false;
          this.refresh();
        };
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });

  };

  /**
   * Handle clicks in this component
   * If a box has changed then we must collect the new set of variants and selling plans
   * If a variant has changed then we must collect boxes that have that variant
   * If a selling plan has changed then we must collect boxes and their variants that have that selling plan
   *
   * @function onClick
   * @returns {null}
   */
  const onClick = (ev) => {
    const name = ev.target.name;
    const value = ev.target.title;
    const itemId = ev.target.getAttribute("data-id");
    alertMessage = null;
    switch (name) {
      case "title":
        // update variants for the box
        currentBox = currentBoxes.find(el => parseInt(el.id) === parseInt(itemId));
        currentVariants = sortVariants(currentBox.variants);
        // what if it doesn't have the currently selected variant?
        //const searchVariant = currentBox.variants.find(el => el.title === currentVariant.title);
        const searchVariant = currentBox.variants.find(el => el.title === boxAttributes.variant);
        if (searchVariant) {
          currentVariant = searchVariant;
        } else {
          currentVariant = currentVariants[0];
          // now we have changed the variant all the dates need to be updated
          // and let the user know
          if (currentVariant.title !== boxAttributes.variant) {
            alertMessage = subscription ? 
              `${value} does not have a ${boxAttributes.variant} option so ${currentVariant.title} has been selected instead`
              : null;
            // now must set the boxAttributes for this option
            const { deliveryDate, chargeDate, orderDayOfWeek } = calculateDates(
              currentVariant.title, // our new variant
              boxAttributes.nextDeliveryDate,
              subscription ? subscription.attributes.lastOrder.delivered : null,
            );
            // assign to collected data
            boxAttributes.nextDeliveryDate = deliveryDate.toDateString();
            boxAttributes.nextChargeDate = chargeDate.toDateString();
            boxAttributes.orderDayOfWeek = orderDayOfWeek;
            boxAttributes.variant = currentVariant.title;
            boxAttributes.variant_id = currentVariant.id;
            boxAttributes.boxPrice = currentVariant.price;
          };
        };
        currentPlans = currentBox.plans;
        // what if it doesn't have the currently selected plan?
        const searchPlan = currentPlan ? currentBox.plans.find(el => el.name === currentPlan.name) : null;
        if (searchPlan) {
          currentPlan = searchPlan;
        } else {
          currentPlan = currentPlans[0];
          boxAttributes.frequency = currentPlan.name;
        };
        // assign to collected data
        boxAttributes.title = value;
        boxAttributes.product_id = currentBox.id;
        boxAttributes.boxPrice = currentVariant.price;
        break;
      case "variant":
        // update boxes for the variant?
        // need to filter through the boxes to find those that have a matched variant title
        currentVariant = currentVariants.find(el => parseInt(el.id) === parseInt(itemId));
        // if back to original variant just reset values
        if (subscription && value === subscription.attributes.variant) {
          boxAttributes.nextDeliveryDate = subscription.attributes.nextDeliveryDate;
          boxAttributes.nextChargeDate = subscription.attributes.nextChargeDate;
          boxAttributes.orderDayOfWeek = subscription.attributes.orderDayOfWeek;
          boxAttributes.variant = subscription.attributes.variant;
          boxAttributes.variant_id = subscription.attributes.variant_id;
          boxAttributes.boxPrice = subscription.attributes.boxPrice;
        } else {
          // calculate dates
          const { deliveryDate, chargeDate, orderDayOfWeek } = calculateDates(
            value, // our new variant
            boxAttributes.nextDeliveryDate,
            subscription ? subscription.attributes.lastOrder.delivered : null,
          );
          // assign to collected data
          boxAttributes.nextDeliveryDate = deliveryDate.toDateString();
          boxAttributes.nextChargeDate = chargeDate.toDateString();
          boxAttributes.orderDayOfWeek = orderDayOfWeek;
          boxAttributes.variant = value;
          boxAttributes.variant_id = currentVariant.id;
          boxAttributes.boxPrice = currentVariant.price;
        };
        break;
      case "frequency":
        currentPlan = currentPlans.find(el => parseInt(el.id) === parseInt(itemId));
        // assign to collected data
        boxAttributes.frequency = value;
        break;
    };
    let wrapper;
    if (selectedBox) {
      wrapper = document.getElementById(`change-box-modal`);
      selectedBox = null;
      boxMessages = null;
      boxProperties = null;
    } else {
      wrapper = document.getElementById(`box-header`);
    };
    //updateFormFields();
    animateFadeForAction(wrapper, () => {
      boxAttributes[name] = value;
      this.refresh();
    });
    ev.target.blur();
  };

  for await (const _ of this) { // eslint-disable-line no-unused-vars

    /*
     * Data passed to form to create the toast message to user on doSave of form
     * These values can be arbitary provided that match the template string
     */
    const toastTemplate = {
      template: "${title} - ${variant} subscription has been queued for update.",
      title: boxAttributes.title,
      variant: boxAttributes.variant,
    };

    if (customer.has_payment_method_in_dunning || !customer.has_valid_payment_method) {
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
          <div class="cf tr mr2 mb2">
            <Button type="primary" onclick={closeModal}>
              Cancel
            </Button>
          </div>
        </Fragment>
      );
    } else {
      yield (
        <div id="change-box-modal" class="w-100 center">
          { fetchError && <Error msg={fetchError} /> }
          { loading && <BarLoader /> }
          <div id="box-header">
            { Object.keys(boxAttributes).length > 1 && (
              <Fragment>
                <h5 class="fw4 tl">
                  { boxAttributes.title }
                  { " - " }
                  { boxAttributes.variant }
                  { " - " }
                  { boxAttributes.frequency }
                  { " - " }
                  ${ boxAttributes.boxPrice }
                </h5>
                <p class="fw4 tc">
                  <div>
                    <div class="dt w-100">
                      <div class="dt-row w-100">
                        <div class="dt-cell w-50 fl tr pr2">
                          <span class="black-80">Charge date:</span>
                        </div>
                        <div class="tl dt-cell w-50 fl pl2">
                          { boxAttributes.nextChargeDate }
                        </div>
                      </div>
                      <div class="dt-row w-100">
                        <div class="dt-cell w-50 fl tr pr2">
                          <span class="black-80">Delivery date:</span>
                        </div>
                        <div class="tl dt-cell w-50 fl pl2">
                          { boxAttributes.nextDeliveryDate }
                        </div>
                      </div>
                    </div>
                  </div>
                </p>
              </Fragment>
            )}
            { currentBoxes && (
              <div class="alert-box dark-blue pa3 mt0 mb3 br3 ba b--dark-blue bg-washed-blue">
                <ul class="list ml1">
                  <li>Delivery dates can be paused or rescheduled after changes have been saved.</li>
                  <li>Products in the box can be changed and edited after changes have been saved.</li>
                </ul>
              </div>
            )}
            { alertMessage && (
              <div class="orange pa2 mv2 br3 ba b--orange bg-light-yellow">
                { alertMessage }
              </div>
            )}
          </div>
          { currentBoxes && currentVariants && currentPlans &&  (
            <p class="lh-copy tc">
              <div class="cf mt3">
                <div class="fl w-100 mb2 pv1 b ba br3 b--silver">
                  { currentBoxes && currentBoxes.map(box => (
                    <Button
                      type="alt-secondary"
                      title={box.title}
                      data-id={box.id}
                      name="title"
                      onclick={ onClick }
                      classes={ box.title === boxAttributes.title ? "disable b" : "b" }
                      selected={ box.title === boxAttributes.title }>
                        { box.title }{ `${ box.title === boxAttributes.title ? " ✓" : "" }` }
                    </Button>
                  ))}
                </div>
                <div class="fl w-100 mb2 pv1 b ba br3 b--silver">
                  { currentVariants && currentVariants.map(variant => (
                    <Button
                      type="alt-secondary"
                      title={variant.title}
                      name="variant"
                      data-id={variant.id}
                      onclick={ onClick }
                      classes={ variant.title === boxAttributes.variant ? "disable b" : "b" }
                      selected={ variant.title === boxAttributes.variant }>
                        { variant.title }{ `${ variant.title === boxAttributes.variant ? " ✓" : "" }` }
                    </Button>
                  ))}
                </div>
                <div class="fl w-100 pv1 b ba br3 b--silver">
                  { currentPlans && currentPlans.map(plan => (
                    <Button
                      type="alt-secondary"
                      title={plan.name}
                      name="frequency"
                      data-id={plan.id}
                      onclick={ onClick }
                      classes={ plan.name === boxAttributes.frequency ? "disable b" : "b" }
                      selected={ plan.name === boxAttributes.frequency }>
                        { plan.name }{ `${ plan.name === boxAttributes.frequency ? " ✓" : "" }` }
                    </Button>
                  ))}
                </div>
              </div>
            </p>
          )}
          <div class="w-100 pl7 mb3">
            <Form
              data={getInitialData()}
              fields={getFields()}
              title={title}
              id={formId}
              meta={toastTemplate}
            />
          </div>
          { currentBoxes && currentVariant && currentPlan && (
            <Fragment>
              <div class="alert-box w-95 tl ba br3 pa3 mh2 mb2 dark-blue bg-washed-blue" role="alert">
                <p class="lh-copy mb1">
                  This is a subscription. By continuing, you agree that the
                  subscription will automatically renew at the price and frequency
                  listed on this page until it ends or you cancel. All
                  cancellations are subject to the cancellation policy that you will 
                  find at {" "}
                  <a class="link b navy" target="_blank" 
                    href={ `https://${localStorage.getItem("shop")}` }
                  >{ localStorage.getItem("shop_title") }</a>
                  .
                </p>
                <p class="tr mr5 mb1">
                  <label class="lh-copy pr3 b v-mid navy" htmlFor="checkedPolicy" for="checkedPolicy">
                    Please confirm
                  </label>
                  <input
                    type="checkbox"
                    name="checkedPolicy"
                    id="checkedPolicy"
                    class="v-mid"
                    checked={ checkedPolicy }
                    onchange={ togglePolicy }
                  />
                </p>
              </div>
              <div class="cf tr mr2 mb2">
                { selectedBox || !subscription ? (
                  <Button type={ checkedPolicy ? "primary" : "secondary" } 
                    onclick={thisSave} classes={ checkedPolicy ? null : "disable o-60" }>
                    Save
                  </Button>
                ) : (
                  ""
                )}
                { subscription && (
                  <Button type={ selectedBox ? "secondary" : "primary" } 
                    classes={ selectedBox ? "dn" : "" }
                    onclick={thisPreview}>
                    Preview
                  </Button>
                )}
                <Button type="secondary" onclick={closeModal}>
                  Cancel
                </Button>
              </div>
            </Fragment>
          )}
          { selectedBox && subscription && (
            <div class="tl">
              { boxMessages.length > 0 && subscription ? (
                <div class="alert-box w-95 tl ba br3 pa3 mh2 mb3 dark-blue bg-washed-blue" role="alert">
                  <div class="i b tl dark-blue mt1 mb3">
                      <span>You will be able to edit your products once the changes have been saved.</span>
                  </div>
                  <p class="tl dark-blue mt1 mb3">
                    { boxMustReconcile ? (
                      <span>The following changes will be made to match your subscription with the upcoming box.</span>
                    ) : (
                      <span>Changes to your box are indicative only and dependent on upcoming boxes.</span>
                    )}
                  </p>
                  { boxMessages.length > 0 && (
                    <div class="tl dark-blue mt1 mb3">
                        <span>Unmatched items listed here can be edited once the box is updated.</span>
                    </div>
                  )}
                  <ul class="">
                    { boxMessages.map(message => (
                      <li class="mv1">{message}</li> 
                    ))}
                  </ul>
                </div>
              ) : (
                <div class="alert-box w-95 tl ba br2 pa3 mh2 mb3 dark-blue bg-washed-blue" role="alert">
                  <p class="mv1">
                    The included products are indicative only and may change for upcoming boxes.
                  </p> 
                </div>
              )}
              <EditProducts
                properties={ boxProperties }
                box={ selectedBox }
                nextChargeDate={ boxAttributes.nextChargeDate }
                hideDetails={ true }
                rc_subscription_ids={ boxAttributes.rc_subscription_ids }
                id="edit-products"
                key="order"
                isEditable={ false }
              />
            </div>
          )}
        </div>
      );

      // what problem am I solving by putting this here?
      if (!currentBoxes) {
        const { error, boxes } = await getBoxes();
        if (error) fetchError = error;

        currentBoxes = [ ...boxes ];
        currentBox = Object.hasOwn(boxAttributes, "product_id") ? currentBoxes.find(el => el.id === boxAttributes.product_id) : null;
        currentVariants = currentBox ? sortVariants(currentBox.variants) : [];
        currentVariant = Object.hasOwn(boxAttributes, "variant_id") ? currentVariants.find(el => el.id === boxAttributes.variant_id) : null;
        currentPlans = currentBox ? currentBox.plans : [];
        currentPlan = Object.hasOwn(boxAttributes, "frequency") ? currentBox.plans.find(el => el.name === boxAttributes.frequency) : null;
        loading = false;
        const wrapper = document.getElementById(`change-box-modal`);
        if (wrapper) {
          animateFadeForAction(wrapper, () => {
            this.refresh();
          });
        } else {
          this.refresh();
        };
      };
    };
  };
};

/**
 * Wrapped component
 *
 * @member {object} ChangeBoxModal
 */
export default ChangeBox;
//export default FormModalWrapper(ChangeBox, options);
