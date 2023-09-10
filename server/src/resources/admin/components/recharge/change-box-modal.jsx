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
import { formatDate, animateFadeForAction, weekdays, findNextWeekday, dateStringSort } from "../helpers";

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
const calculateDates = (deltaDays, newVariant, currentDate) => {
  // deltaDays is calculated from the current delivery to match a similar time in the future
  const deliveryDate = findNextWeekday(weekdays.map(el => el.toLowerCase()).indexOf(newVariant.toLowerCase()));
  deliveryDate.setDate(deliveryDate.getDate() + deltaDays);

  // however always make the days later than the current day regardless of weekday
  // currentDate comes from the original subscription
  const currentDeliveryDate = new Date(Date.parse(currentDate));
  if (deliveryDate.getTime() < currentDeliveryDate.getTime()) {
    console.log("moving it forward a week");
    deliveryDate.setDate(deliveryDate.getDate() + 7);
  };

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
  const chargeDate = new Date(deliveryDate.toDateString());
  chargeDate.setDate(chargeDate.getDate() - 3);

  // Put to the required yyyy-mm-dd format
  // Not returned, just testing
  // Could use .split("T")[0] instead of substring
  const nextChargeScheduledAt = formatDate(chargeDate);
  // does ISOString mess with things given timezone offset?
  console.log(deliveryDate);
  console.log(nextChargeScheduledAt);

  return { deliveryDate, chargeDate, orderDayOfWeek };

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
  saveMsg: "Updating subscription ... please be patient, it will take some seconds.",
  successMsg: "Updates have been queued, reloading ...",
  useSession: false, // set up socket.io to get feedback
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
  const { doSave, closeModal, title, subscription, formId } = props;

  console.log(subscription);
  /**
   * Holds all the data
   *
   * @member {object} boxAttributes and others
   */
  const boxAttributes = { ...subscription.attributes };
  boxAttributes.boxPlan = ""; // initialize
  console.log(boxAttributes);
  let currentBoxes;
  let currentBox;
  let currentVariants;
  let currentVariant;
  let currentPlans;
  let currentPlan;

  console.log(subscription);
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
   * The fetch error if any
   *
   * @member {object|string} fetchError
   */
  let fetchError = null;
  /**
   * Calculate the days out from now the current delivery date is so that when
   * new delivery dates are calculated they will be a similar time out into the
   * future
   *
   * @function getDayDiff
   * @returns {integer} days
   */
  const getDayDiff = () => {
    const nextDeliveryDate = new Date(Date.parse(boxAttributes.nextDeliveryDate));
    // get closest day to now
    const searchDate = findNextWeekday(weekdays.map(el => el.toLowerCase()).indexOf(boxAttributes.variant.toLowerCase()));
    // get difference between this and the delivery date so we move to a similar distance in the future
    const deltaTime = nextDeliveryDate.getTime() - searchDate.getTime();
    let deltaDays = Math.ceil(deltaTime / (1000 * 3600 * 24));
    // add 7 to keep it always ahead of the current delivery date
    //deltaDays += 7;
    // if negative make positive
    deltaDays = Math.abs(deltaDays);
    return deltaDays;
  };

  /**
   * Keep the day difference as a constant variable
   *
   * @member {integer} deltaDays
   */
  const deltaDays = getDayDiff();

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
    data.subscription_id = boxAttributes.subscription_id;
    data.order_day_of_week = boxAttributes.orderDayOfWeek;
    data.do_update = false;

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
      subscription_id: {
        type: "hidden",
        datatype: "string",
      },
      order_day_of_week: {
        type: "hidden",
        datatype: "integer",
      },
    };
  };

  /**
   * Local save to perform actions before calling form-modal doSave
   *
   * @function thisSave
   * @returns {null}
   */
  const thisSave = () => {
    this.dispatchEvent(
      new CustomEvent("customer.disableevents", {
        bubbles: true,
        detail: { subscription_id: boxAttributes.subscription_id },
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
    /*
    console.log(JSON.stringify(currentBox, null, 2));
    console.log(JSON.stringify(currentVariant, null, 2));
    console.log(JSON.stringify(currentPlan, null, 2));
    console.log(boxAttributes.orderDayOfWeek);
    console.log(boxAttributes.nextChargeDate);
    console.log(boxAttributes.nextDeliveryDate);
    */
    loading = true;
    this.refresh();

    let { error, json } = await Fetch(encodeURI(`/api/current-boxes-by-product/${currentBox.id}`))
      .then((result) => {
        return result;
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
          return null;
        };
        console.log(json);
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
    if (!foundDate) {
      foundDate = Object.keys(json).sort(dateStringSort).pop();
    };
    selectedBox = json[foundDate];

    const boxLists = {};
    for (const [key, value] of Object.entries(subscription.properties)) {
      boxLists[key] = value.split(",").filter(el => el !== "");
    };
    boxLists["Delivery Date"] = boxAttributes.nextDeliveryDate;

    selectedBox.variant_id = currentVariant.id;
    selectedBox.variant_title = currentVariant.title;
    selectedBox.variant_name = `${currentBox.title} - ${currentVariant.title}`;;

    console.log(selectedBox);

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
          console.log(json);
          boxProperties = json.properties;
          console.log(boxProperties);
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

  const onClick = (ev) => {
    const name = ev.target.name;
    const value = ev.target.title;
    const itemId = ev.target.getAttribute("data-id");
    switch (name) {
      case "title":
        // update variants for the box
        currentBox = currentBoxes.find(el => parseInt(el.id) === parseInt(itemId));
        currentVariants = currentBox.variants;
        // what if it doesn't have the currently selected variant?
        currentVariant = currentBox.variants.find(el => el.title === currentVariant.title);
        currentPlans = currentBox.plans;
        // what if it doesn't have the currently selected plan?
        currentPlan = currentBox.plans.find(el => el.name === currentPlan.name);
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
        if (value === subscription.attributes.variant) {
          boxAttributes.nextDeliveryDate = subscription.attributes.nextDeliveryDate;
          boxAttributes.nextChargeDate = subscription.attributes.nextChargeDate;
          boxAttributes.orderDayOfWeek = subscription.attributes.orderDayOfWeek;
          boxAttributes.variant = subscription.attributes.variant;
          boxAttributes.variant_id = subscription.attributes.variant_id;
          boxAttributes.boxPrice = subscription.attributes.boxPrice;
        } else {
          // calculate dates
        const { deliveryDate, chargeDate, orderDayOfWeek } = calculateDates(
          deltaDays, // day difference into future
          value, // our new variant
          subscription.attributes.nextDeliveryDate, // the original date
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

    yield (
      <div id="change-box-modal" class="w-100 center">
        { fetchError && <Error msg={fetchError} /> }
        { loading && <BarLoader /> }
        <div id="box-header">
          <h4 class="fw4 tl fg-streamside-maroon">
            { boxAttributes.title }
            { " - " }
            { boxAttributes.variant }
            { " - " }
            { boxAttributes.frequency }
            { " - " }
            ${ boxAttributes.boxPrice }
          </h4>
          <h5 class="fw4 tc fg-streamside-maroon">
            <div>
              <div class="dt w-100">
                <div class="dt-row w-100">
                  <div class="dt-cell w-50 fl tr pr2">
                    <span class="o-50">Charge date:</span>
                  </div>
                  <div class="tl dt-cell w-50 fl pl2">
                    { boxAttributes.nextChargeDate }
                  </div>
                </div>
                <div class="dt-row w-100">
                  <div class="dt-cell w-50 fl tr pr2">
                    <span class="o-50">Delivery date:</span>
                  </div>
                  <div class="tl dt-cell w-50 fl pl2">
                    { boxAttributes.nextDeliveryDate }
                  </div>
                </div>
              </div>
            </div>
          </h5>
          { currentBoxes && (
            <div class="f4 dark-blue pa2 mt0 mb3 br3 ba b--dark-blue bg-washed-blue">
              Delivery dates can be paused or rescheduled after changes are saved.
            </div>
          )}
        </div>
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
                    { box.title }
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
                    { variant.title }
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
                    { plan.name }
                </Button>
              ))}
            </div>
          </div>
        </p>
        <div class="w-100 pl7 mb3">
          <Form
            data={getInitialData()}
            fields={getFields()}
            title={title}
            id={formId}
            meta={toastTemplate}
          />
        </div>
        { currentBoxes && (
          <div class="cf tr mr2 mb2">
            { selectedBox && (
              <Button type="primary" onclick={thisSave}>
                Save
              </Button>
            )}
            <Button type={ selectedBox ? "secondary" : "primary" } 
              onclick={thisPreview}>
              Preview
            </Button>
            <Button type="secondary" onclick={closeModal}>
              Cancel
            </Button>
          </div>
        )}
        { selectedBox && (
          <div class="tl">
            { boxMessages.length > 0 ? (
              <div class="w-95 tl ba br2 pa2 mh2 mb3 dark-blue bg-washed-blue" role="alert">
                <h5 class="tc dark-blue mt1 mb3">
                  { boxMustReconcile ? (
                    <span>The following changes will be made to match your subscription with the upcoming box.</span>
                  ) : (
                    <span>Changes to your box are indicative only and dependent on upcoming boxes.</span>
                  )}
                </h5>
                <div class="f4 tc dark-blue mt1 mb3">
                    <span>You will be able to edit your products once the changes have been saved.</span>
                </div>
                { boxMessages.map(message => (
                  <p class="mv1">{message}</p> 
                ))}
              </div>
            ) : (
              <div class="w-95 tl ba br2 pa2 mh2 mb3 dark-blue bg-washed-blue" role="alert">
                <p class="mv1">
                  The included products are indicative only and may change for upcoming boxes.
                </p> 
              </div>
            )}
            <EditProducts
              properties={ boxProperties }
              box={ selectedBox }
              nextChargeDate={ boxAttributes.nextChargeDate }
              rc_subscription_ids={ boxAttributes.rc_subscription_ids }
              id="edit-products"
              key="order"
              isEditable={ false }
            />
          </div>
        )}
      </div>
    );

    if (!currentBoxes) {
      const { error, boxes } = await getBoxes();
      if (error) fetchError = error;

      currentBoxes = [ ...boxes ];
      currentBox = currentBoxes.find(el => el.id === boxAttributes.product_id);
      currentVariants = currentBox.variants;
      currentVariant = currentVariants.find(el => el.id === boxAttributes.variant_id);
      currentPlans = currentBox.plans;
      currentPlan = currentBox.plans.find(el => el.name === boxAttributes.frequency);
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

/**
 * Wrapped component
 *
 * @member {object} ChangeBoxModal
 */
export default FormModalWrapper(ChangeBox, options);
