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
import { capWords, dateStringForInput, animateFadeForAction } from "../helpers";

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

  const CollapsibleProducts = CollapseWrapper(EditProducts);
  /**
   * Hold collapsed state of product edit business
   *
   * @member {boolean} collapsed
   */
  let collapsed = true;

  /*
   * Control the collapse of product list
   * @function toggleCollapse
   */
  const toggleCollapse = () => {
    collapsed = !collapsed;
    this.refresh();
  };

  /**
   * Retain form data after changes
   *
   * @member {object} formData
   */
  let formData = {};
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
   * Extra attributes for EditProduct, including images
   * See recharge/subscription for full usage of all attributes
   *
   * @member {object} attributes
   */
  let attributes = null;
  /**
   * Fields fetched from api
   *
   * @member {object} fields
   */
  let fields = null;

  /*
   * Get the boxes for the selected date
   */
  const titlesForDate = async (delivered) => {
    const timestamp = new Date(Date.parse(formData.delivered)).getTime();
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
   * Create a loader element
   */
  const getLoader = () => {
    return `<div class="lds-ellipsis" style="height: 10px"><div></div><div></div><div></div><div></div></div></div>`;
  };

  /*
   * Update pickup input on delivered change
   * Check for date difference and maintain that difference
   * Provide select options for 3 days prior to delivert
   */
  const updatePickup = (newDate) => {
    const currentDelivered = new Date(Date.parse(newDate));
    const delivered = new Date(Date.parse(newDate));

    // make select list to include 3 days prior to delivery day
    fields["Pickup Date"].datalist = [delivered.toDateString()];
    for (const i of [1, 2]) {
      delivered.setDate(delivered.getDate() - 1);
      fields["Pickup Date"].datalist.unshift(delivered.toDateString());
    };

    if (order) {
      const orderPickup = new Date(Date.parse(order.pickup));
      const orderDelivered = new Date(Date.parse(order.delivered));
      const deltaDay = orderDelivered.getDate() - orderPickup.getDate();
      currentDelivered.setDate(currentDelivered.getDate() - deltaDay);
      // set pickup to same delta day as the original order
      formData.pickup = currentDelivered.toDateString();
    } else {
      formData.pickup = currentDelivered.toDateString();
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
        getBox({
          delivered: input.value,
          product_title: ev.target.value,
          _id: order ? order._id : null,
        });
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
      .then(({ boxes }) => {
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
          getBox({
            delivered: ev.target.value,
            product_title: input.value,
            _id: order ? order._id : null,
          });
        };
      });
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
    return await getOrderFields(delivered, onBoxChange, onDeliveredChange)
      .then(({error, json}) => {
        loading = false;
        if (!error) {
          fields = json;
          if (!order) {
            fields.Box.datalist.unshift("Select a box");
          };
          this.refresh();
        } else {
          fetchError = error;
          this.refresh();
        };
    });
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
      fields["Pickup Date"].datalist = [delivered.toDateString()];
      for (const i of [1, 2]) {
        delivered.setDate(delivered.getDate() - 1);
        fields["Pickup Date"].datalist.unshift(delivered.toDateString());
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
    const target = document.querySelector("#edit-products");
    const oldCollapsed = collapsed;
    const fix = () => {
      collapsed = true;
      boxLoading = true;
      box = null;
      properties = null;
      messages = null;
      this.refresh()
    };
    if (target) {
      animateFadeForAction("edit-products", fix);
    };
    const timestamp = new Date(Date.parse(options.delivered)).getTime();
    const order_id = options._id;
    const product_title = encodeURIComponent(options.product_title);
    let uri = `/api/get-reconciled-box/${timestamp}/${product_title}`;
    if (order_id) {
      uri += `/${order_id}`;
    };
    return await Fetch(uri)
      .then(({error, json}) => {
        loading = false;
        if (!error) {
          box = json.box;
          properties = json.properties;
          messages = json.messages;
          attributes = json.attributes;
          collapsed = oldCollapsed;
          boxLoading = false;
          formData.product_title = box.shopify_title;
          formData.product_id = box.shopify_product_id;
          formData.variant_id = box.variant_id;
          formData.variant_name = box.variant_name;
          formData.variant_title = box.variant_title;
          this.refresh();
        } else {
          fetchError = error;
          this.refresh();
        };
    });
  };

  await getFields(delivered);
  await getBox(order);
  formData = getInitialData();
  // console.log(JSON.stringify(formData, null, 2));

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

  for await (const _ of this) { // eslint-disable-line no-unused-vars
    yield (
      <Fragment>
        {loading && <BarLoader />}
        {fetchError && <Error msg={fetchError} />}
        {!loading && !fetchError && fields && (
          <div class="w-90 center ph1">
            <Form
              data={formData}
              fields={fields}
              title={title}
              id={formId}
              meta={toastTemplate}
            />
            { !loading && box && messages.length > 0 && (
              <div class="w-95 ba br2 pa3 mh2 mb3 dark-blue bg-washed-blue" role="alert">
                { messages.map(message => (
                  <p>{message}</p> 
                ))}
              </div>
            )}
            <div class="tr pr2 pb2">
              { !loading && box && (
                <Button type="secondary" onclick={toggleCollapse}>
                  { collapsed ? "Edit products" : "Hide products" }
                </Button>
              )}
              <Button type="primary" onclick={doSave}>
                Save Order
              </Button>
              <Button type="secondary" onclick={closeModal}>
                Cancel
              </Button>
            </div>
            { !loading && box && !boxLoading && (
              <Fragment>
                <CollapsibleProducts
                  collapsed={ collapsed }
                  properties={ properties }
                  box={box}
                  images={attributes.images}
                  id="edit-products"
                  isEditable={ true }
                />
              </Fragment>
            )}
          </div>
        )}
      </Fragment>
    );
  }
}

export default UpsertOrderModal;
