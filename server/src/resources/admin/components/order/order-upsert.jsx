/**
 * Creates element to render a modal form for adding or editing an order. This
 * component sets up the form fields and initial data to render a {@link
 * module:app/form/form~Form|Form}. Essential options for the form are a
 * dictionary of fields and initialData.
 *
 * @module app/components/order-upsert
 * @requires module:app/form/form~Form
 * @exports UpsertOrderModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

import CollapseWrapper from "../lib/collapse-animator";
import EditProducts from "../products/edit-products";
import Button from "../lib/button";
import Error from "../lib/error";
import { Fetch } from "../lib/fetch";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import BarLoader from "../lib/bar-loader";
import Form from "../form";
import getOrderFields from "./order-fields";
import { getLoader, capWords, dateStringForInput, animateFadeForAction } from "../helpers";

/**
 * Create a modal to add or edit an order..
 *
 * @generator
 * @yields {Element} A {@link module:app/form/form~Form|Form} and save/cancel buttons.
 * @param {object} props Property object
 * @param {Function} props.doSave - The save action
 * @param {Function} props.closeModal - The cancel and close modal action
 * @param {string} props.title - Form title
 * @param {object} props.order - The order (or null if adding) to be edited
 * @param {string} props.delivered - The delivery date as a string
 * @param {string} props.formId - The unique form indentifier
 */
async function* UpsertOrderModal(props) {
  const { doSave, closeModal, title, order, delivered, formId } = props;

  /**
   * Retain form data after changes
   *
   * @member {object} formData
   */
  let formData = {};
  /**
   * If form not complete
   *
   * @member {object|string} formError
   */
  let formError = null;
  /**
   * If fetch returns an error
   *
   * @member {object|string} fetchError
   */
  let fetchError = null;
  /**
   * True while loading data from api
   *
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * True while loading box from api, required to manage the refresh of
   * EditProduct component
   *
   * @member {boolean} boxLoading
   */
  let boxLoading = true;
  /**
   * Box fetched from api
   *
   * @member {object} box
   */
  let box = null;
  /**
   * Properties fetched from api
   * If the order and box match then they will be equal to order properties
   * However a different box may not have the same products so the properties
   * get reconciled as best as possible - and there will be a list of messages
   *
   * @member {object} properties
   */
  let properties = null;
  /**
   * Messages fetched from api defining updates to properties
   *
   * @member {object} messages
   */
  let messages = [];
  /**
   * Fields fetched from api
   *
   * @member {object} fields
   */
  let fields = null;
  /**
   * Is the box reconciled?
   * If not then the products cannot be edited.
   * However other order attributes can be.
   * The default is false until the box has been reconciled
   *
   * @member {boolean} isBoxEditable
   */
  let isBoxEditable = false;
  /**
   * Is the box reconciled or are we ignoring the unreconciled box
   * The default is false until the box has been reconciled or 'ignore' choosen
   *
   * @member {boolean} isBoxReconciled
   */
  let isBoxReconciled = false;

  /*
   * Get the boxes for the selected date
   */
  const titlesForDate = async (delivered) => {
    const timestamp = new Date(Date.parse(delivered)).getTime();
    const uri = `/api/titles-for-date/${timestamp}`;
    return await Fetch(uri)
      .then(({error, json}) => {
        if (!error) {
          return json;
        } else {
          fetchError = error;
          this.refresh();
        };
    });
  };

  /*
   * Get the boxes for the selected date
   */
  const datesForTitle = async (product_title) => {
    const title = encodeURIComponent(product_title);
    const uri = `/api/dates-for-title/${title}`;
    return await Fetch(uri)
      .then(({error, json}) => {
        loading = false;
        if (!error) {
          return json;
        } else {
          fetchError = error;
          this.refresh();
        };
    });
  };

  /*
   * Update pickup input on delivered change
   * Check for date difference and maintain that difference
   * Provide select options for 3 days prior to delivert
   */
  const updatePickup = (newDate) => {
    const currentDelivered = new Date(Date.parse(newDate));
    const delivered = new Date(Date.parse(newDate));

    const dateString = delivered.toDateString();
    // make select list to include 3 days prior to delivery day
    fields["Pickup Date"].datalist = [dateString];
    formData.pickup = dateString;
    for (const i of [1, 2]) {
      delivered.setDate(delivered.getDate() - 1);
      fields["Pickup Date"].datalist.unshift(delivered.toDateString());
    };

  };

  /*
   * Updates on box selection
   * Load dates available for the selected box
   */
  const onBoxChange = async (ev) => {
    // get new set of dates available, update delivered field
    const input = document.querySelector("select#delivered");
    const options = Array.from(input.options);
    const label = input.parentNode.querySelector("label");
    const inputTitle = label.innerHTML;
    label.innerHTML = getLoader();
    await datesForTitle(ev.target.value)
      .then(dates => {
        label.innerHTML = inputTitle;
        fields.Delivered.datalist = dates;
        let notice;
        if (dates.length === 0) {
          notice = "No dates available for the box";
        } else if (dates.length === 1) {
          input.value = dates[0];
          updatePickup(input.value);
          notice = "Only one date available for the box";
        } else {
          notice = "Loaded available dates for box";
        };
        formData.delivered = input.value;
        formData.product_title = ev.target.value;
        this.dispatchEvent(toastEvent({
          notice,
          bgColour: "black",
          borderColour: "black"
        }));
      });
    // always get the box from the updated form data because if it has changed
    // then the included products will likely need updating
    // this will also correctly set the variant - calculated by the date
    // need to check if variant is available otherwise an error comes from not finding a variant
    getBox({
      delivered: formData.delivered,
      product_title: formData.product_title,
      _id: order ? order._id : null,
    });
  };

  /*
   * On delivered selection change
   * Load boxes available for the selected box
   * Update pickup options
   */
  const onDeliveredChange = async (ev) => {
    if (!ev.target.checkValidity()) return;
    // get new set of boxes available, update box field
    const input = document.querySelector("select#product_title");
    const label = input.parentNode.querySelector("label");
    const inputTitle = label.innerHTML;
    label.innerHTML = getLoader();
    updatePickup(ev.target.value);
    await titlesForDate(ev.target.value)
      .then((boxes) => {
        label.innerHTML = inputTitle;
        fields.Box.datalist = boxes.map(el => el.shopify_title);
        let notice;
        if (boxes.length === 0) {
          notice = "No boxes available for the box";
        } else if (boxes.length === 1) {
          input.value = boxes[0].shopify_title;
          notice = "Only one box available for the box";
        } else {
          notice = "Loaded available boxes for box";
        };
        formData.delivered = ev.target.value;
        formData.product_title = input.value;
        if (!input.value === "Select a box") {
          this.dispatchEvent(toastEvent({
            notice,
            bgColour: "black",
            borderColour: "black"
          }));
        } else {
          fields.Box.datalist.unshift("Select a box");
          this.refresh(); // otherwise called after fetching box
        };
      });
      
    // always get the box from the updated form data because if it has changed
    // then the included products will likely need updating
    // this will also correctly set the variant - calculated by the date
    getBox({
      delivered: formData.delivered,
      product_title: formData.product_title,
      product_id: formData.product_id,
      _id: order ? order._id : null,
    });
  };

  /**
   * Pick up all changes to form inputs, update formData object and refresh
   * component after refetching fields
   *
   * @function onChange
   * @returns {null}
   */
  const onChange = (ev) => {
    if (ev.target) {
      formData[ev.target.id] = ev.target.value.toString();
    } else if (hasOwnProp.call(ev, 'value')) {
      formData[ev.id] = ev.value;
    };
  };

  /**
   * The order form fields keyed by field title string - required by {@link
   * module:app/form/form~Form|Form}. The `delivered` field depends on list
   * of upcoming box dates fetched from api and therefore is asynchronous and
   * handles error. See {@link
   * module:app/components/order-fields~getOrderFields|getOrderFields} for
   * clarification.
   *
   * @member {object} fields
   */
  const getFields = async (delivered) => {
    const { error, json } =  await getOrderFields(order, delivered, onBoxChange, onDeliveredChange, onChange)
    loading = false;
    if (!error) {
      fields = json;
      if (!order) {
        fields.Box.datalist.unshift("Select a box");
      };
      formData = getInitialData();
      await getBox(order);
    } else {
      fetchError = error;
      this.refresh();
    };
  };

  /**
   * The initial form data - required by {@link
   * module:app/form/form~Form|Form}.  If an order supplied returns the order
   * else compiles reasonable defaults.
   *
   * @function getInitialData
   * @returns {object} The initial form data
   */
  const getInitialData = () => {
    let result;

    if (typeof order !== "undefined") {
      result = { ...order };
      result.source = JSON.stringify(order.source);
      result.shipping = JSON.stringify(order.shipping);
      const delivered = new Date(Date.parse(order.delivered));
      if (!isNaN(delivered.getTime())) { // those "No delivery date" entries
        fields["Pickup Date"].datalist = [delivered.toDateString()];
        for (const i of [1, 2]) {
          delivered.setDate(delivered.getDate() - 1);
          fields["Pickup Date"].datalist.unshift(delivered.toDateString());
        };
      } else {
        fields["Delivered"].datalist.unshift("Select a date");
      };
      return result;
    };
    result = {};
    for (const [label, value] of Object.entries(fields)) {
      let id = value.id;
      if (typeof id === "undefined") {
        id = label.toLowerCase().replace(/ /g, "-");
      };
      result[id] = "";
    };
    result.delivered = delivered;
    result.pickup = delivered;
    const date = new Date(Date.parse(delivered));
    fields["Pickup Date"].datalist = [date.toDateString()];
    for (const i of [1, 2]) {
      date.setDate(date.getDate() - 1);
      fields["Pickup Date"].datalist.unshift(date.toDateString());
    };
    return result;
  };

  /*
   * Data passed to form to create the toast message to user on doSave of form
   * These values can be arbitary provided that match the template string
   */
  const toastTemplate = (typeof order === "undefined") ?
    {
      template: "Added order.",
    } : {
      template: "Edited order #${order_number}.",
      order_number: order.order_number,
  };

  /*
   * Get the box, the api runs an algorithm to match up order properties for
   * the avaiable products in the box, also sets variant_id, variant_name, and
   * variant_title, collected from shopify
   *
   */
  const getBox = async (options) => {
    if (!options || !Object.hasOwnProperty.call(options, "product_title")) {
      // on adding an order
      return;
    };
    const target = document.querySelector("#edit-products-order");
    const fix = () => {
      boxLoading = true;
      box = null;
      properties = null;
      messages = [];
      this.refresh()
    };
    if (target) {
      animateFadeForAction(target, fix);
    };
    const timestamp = new Date(Date.parse(options.delivered)).getTime();
    if (isNaN(timestamp)) {
      // no delivery date raise error that delivery date should be updated first
      isBoxEditable = false;
      // it's not but we let it pass by choice
      isBoxReconciled = true;
      // clear the messages
      messages = [];
      box = null;
      return;
    };;
    const order_id = options._id;
    const product_title = encodeURIComponent(options.product_title);
    const product_identifier = Boolean(options.product_id) ? options.product_id : product_title;
    let uri = `/api/get-reconciled-box/${timestamp}/${product_identifier}`;
    if (order_id) {
      uri += `/${order_id}`;
    };
    // yes reconcile the box
    if (options.updating) {
      uri += `?update=true`;
    };
    return await Fetch(uri)
      .then(({error, json}) => {
        loading = false;
        if (!error) {
          box = json.box;
          properties = json.properties;
          isBoxReconciled = json.reconciled;
          if (!json.reconciled) messages = json.messages;
          isBoxEditable = isBoxReconciled; // no messages, no updates required
          formData.including = properties["Including"].split(",").filter(el => Boolean(el));
          formData.addons = properties["Add on Items"].split(",").filter(el => Boolean(el));
          formData.swaps = properties["Swapped Items"].split(",").filter(el => Boolean(el));
          formData.removed = properties["Removed Items"].split(",").filter(el => Boolean(el));
          boxLoading = false;
          formData.product_title = box.shopify_title;
          formData.product_id = box.shopify_product_id;
          formData.variant_id = box.variant_id;
          formData.variant_name = box.variant_name;
          formData.variant_title = box.variant_title;
          formError = null;
          fetchError = null;
          this.refresh();
        } else {
          fetchError = error;
          this.refresh();
        };
    });
  };

  /**
   * For messaging user
   */
  this.addEventListener("toastEvent", Toaster);

  /**
   * @function productsChanged
   * @listens productChangeEvent
   */
  const productsChanged = async (ev) => {
    const { properties: props, total_price } = ev.detail;
    // try this by assigning to formData and refreshing

    formData.including = props["Including"]
      .map(el => `${el.shopify_title }${ el.quantity > 1 ? ` (${ el.quantity })` : ""}`);
    formData.addons = props["Add on Items"]
      .map(el => `${el.shopify_title }${ el.quantity > 1 ? ` (${ el.quantity })` : ""}`);
    formData.removed = props["Removed Items"]
      .map(el => `${el.shopify_title }${ el.quantity > 1 ? ` (${ el.quantity })` : ""}`);
    formData.swaps = props["Swapped Items"]
      .map(el => `${el.shopify_title }${ el.quantity > 1 ? ` (${ el.quantity })` : ""}`);
    formData.total_price = (total_price * 0.01).toFixed(2);

    this.refresh();
  };

  /**
   * For updating product lists
   *
   * @listens productsChangeEvent From EditProducts
   */
  this.addEventListener("productsChangeEvent", productsChanged);

  const saveData = (ev) => {
    if (!Boolean(formData.product_id)) {
      formError = "A box must be selected";
      this.refresh();
      return;
    };
    doSave(ev);
  };

  /**
   * Reconclie the box by recalling fetch method with update=true.
   * Then we can allow editing of the box and include in save method
   * Needs to reload a reconciled box (update=true) and allow editing of products
   *
   * @function doReconcileBox
   */
  const doReconcileBox = async () => {
    // reload box with update to reconcile box
    //const options = { ...order };

    // the box and delivery date may have changed so now want to fix the includes etc.
    // if nothing was changed then this will match the order
    const options = { ...formData };
    options.updating = true;

    await getBox(options);
    this.refresh();
  };

  /**
   * Do not reconcile the box, but allow editing of other order properties.
   * Do not allow editing of products, but show the save button on other edits.
   * 
   * @function ignoreReconcileBox
   */
  const ignoreReconcileBox = () => {
    // leave box uneditable
    isBoxEditable = false;
    // it's not but we let it pass by choice
    isBoxReconciled = true;
    // clear the messages
    messages = [];
    this.refresh();
  };

  await getFields(delivered);

  for await (const _ of this) { // eslint-disable-line no-unused-vars
    yield (
      <Fragment>
        {loading && <BarLoader />}
        {!loading && fields && (
          <div class="w-90 center ph1">
            <div class="mh2">
              {fetchError && <Error msg={fetchError} />}
              {formError && <Error msg={formError} />}
            </div>
            { (!isBoxEditable && isBoxReconciled && !box) && (
              <div class="tl ba br2 pa3 mh2 mv1 orange bg-light-yellow" role="alert">
                <p>
                  The delivery date should be updated and saved before products can be edited.
                </p>
              </div>
            )}
            <Form
              data={formData}
              fields={fields}
              title={title}
              id={formId}
              meta={toastTemplate}
            />
            { !loading && box && messages.length > 0 && (
              <Fragment>
                { !isBoxEditable && (
                  <div class="tl ba br2 pa3 mh2 mv1 orange bg-light-yellow" role="alert">
                    <p>
                      Products cannot be edited because the items in the order do
                      match those for the current box. Other fields may be edited
                      and the order can be reconciled with the box to allow the
                      editing of products.
                    </p>
                  </div>
                )}
                { (isBoxEditable && isBoxReconciled) && (
                  <div class="tl ba br2 pa3 mh2 mv1 orange bg-light-yellow" role="alert">
                    <p>
                      The order has been reconciled with the box but is unsaved.
                    </p>
                  </div>
                )}
                <div class="w-95 tl ba br2 pa3 mh2 mb3 dark-blue bg-washed-blue" role="alert">
                  { messages.map(message => (
                    <p>{message}</p> 
                  ))}
                  { !isBoxReconciled && (
                    <div class="tr">
                      <Button type="primary" onclick={async () => await doReconcileBox() }>
                        Reconcile box
                      </Button>
                      <Button type="secondary" onclick={ignoreReconcileBox}>
                        Ignore
                      </Button>
                    </div>
                  )}
                </div>
              </Fragment>
            )}
            <div class="tr pr2 pb2">
              { ( isBoxEditable || isBoxReconciled ) && (
                <Fragment>
                  <Button type="primary" onclick={saveData}>
                    Save Order
                  </Button>
                  <Button type="secondary" onclick={closeModal}>
                    Cancel
                  </Button>
                </Fragment>
              )}
            </div>
            { !loading && box && !boxLoading && (
              <div class="tl">
                <EditProducts
                  properties={ properties }
                  box={box}
                  id="edit-products"
                  key="order"
                  isEditable={ isBoxEditable }
                />
              </div>
            )}
          </div>
        )}
      </Fragment>
    );
  };
};

export default UpsertOrderModal;
