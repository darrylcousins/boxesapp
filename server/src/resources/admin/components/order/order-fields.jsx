/**
 * Form fields for
 * * {@link module:app/components/order-add|AddOrderModal}
 * * {@link module:app/components/order-edit|EditOrderModal}
 *
 * @module app/components/order-fields
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { Fetch } from "../lib/fetch";
import { dateStringForInput } from "../helpers";

/**
 * The order form fields keyed by field title string - required by {@link
 * module:app/form/form~Form|Form}. Delivery dates are collected from {@link api/current-box-dates}
 *
 * @function getOrderFields
 * @param {string} delivered The delivery date
 * @returns {object} The form fields keyed by field title string and error (null if no error)
 */
const getOrderFields = async (delivered, onBoxChange, onDeliveredChange, onChange) => {

  const { error, json } = await Fetch("/api/current-box-dates?current")
    .then(result => result)
    .catch(e => ({
      error: e, json: null
    }));

  // should maybe through an error here
  // or validation error on box field?
  /*
  if (!json.includes(delivered)) {
    json.unshift(delivered);
  };
  */

  return {
    error,
    json: {
      _id: {
        id: "_id",
        type: "hidden",
        datatype: "string",
      },
      source: {
        type: "hidden",
        datatype: "string",
      },
      shipping: {
        type: "hidden",
        datatype: "string",
      },
      shopify_order_id: {
        type: "hidden",
        datatype: "integer",
      },
      product_id: {
        type: "hidden",
        datatype: "integer",
      },
      variant_id: {
        type: "hidden",
        datatype: "integer",
      },
      variant_title: {
        type: "hidden",
        datatype: "string",
      },
      variant_name: {
        type: "hidden",
        datatype: "string",
      },
      inserted: {
        type: "hidden",
        datatype: "string",
      },
      Name: {
        id: "name", // compiled from first and last
        type: "hidden",
        datatype: "string",
      },
      "Order Number": {
        id: "order_number",
        type: "hidden",
        datatype: "string",
      },
      Price: {
        id: "total_price",
        type: "hidden",
        datatype: "string",
      },
      "First Name": {
        id: "first_name",
        type: "text",
        size: "25",
        datatype: "string",
        required: true,
        onchange: onChange,
      },
      "Last Name": {
        id: "last_name",
        type: "text",
        size: "25",
        datatype: "string",
        required: true,
        onchange: onChange,
      },
      Telephone: {
        id: "phone",
        type: "text",
        size: "25",
        datatype: "string",
        required: false,
        onchange: onChange,
      },
      "Street Address": {
        id: "address1",
        type: "text",
        size: "25",
        datatype: "string",
        required: true,
        onchange: onChange,
      },
      Suburb: {
        id: "address2",
        type: "text",
        size: "25",
        datatype: "string",
        required: false,
        onchange: onChange,
      },
      City: {
        id: "city",
        type: "text",
        size: "25",
        datatype: "string",
        required: true,
        onchange: onChange,
      },
      Postcode: {
        id: "zip",
        type: "text",
        size: "20",
        datatype: "string",
        required: true,
        onchange: onChange,
      },
      Email: {
        id: "contact_email",
        type: "text",
        size: "30",
        datatype: "string",
        required: false,
        onchange: onChange,
      },
      /*
      Box: {
        id: "product_title",
        type: "text",
        size: "50",
        datatype: "string",
        required: true,
      },
      */
      Box: {
        id: "product_title",
        type: "input-select",
        size: "50",
        datatype: "string",
        datalist: json.boxes,
        required: true,
        onchange: onBoxChange,
      },
      Delivered: {
        id: "delivered",
        size: "25",
        required: true,
        type: "input-select",
        datatype: "string",
        datalist: json.dates,
        onchange: onDeliveredChange,
        /*
        datatype: "date",
        type: "date", // needs to be calendar select
        min: dateStringForInput(),
        */
      },
      "Pickup Date": {
        id: "pickup",
        size: "25",
        type: "input-select",
        datatype: "string",
        datalist: [],
        onchange: onDeliveredChange,
        required: true,
        /*
        type: "date", // needs to be calendar select
        datatype: "date",
        min: dateStringForInput(),
        max: dateStringForInput(delivered),
        */
      },
      addons: {
        type: "hidden",
        datatype: "array",
      },
      removed: {
        type: "hidden",
        datatype: "array",
      },
      swaps: {
        type: "hidden",
        datatype: "array",
      },
      including: {
        type: "hidden",
        datatype: "array",
      },
      "Delivery Note": {
        id: "note",
        type: "textarea",
        size: "100",
        datatype: "string",
        required: false,
        rows: 2,
        onchange: onChange,
      },
    },
  };
};

export default getOrderFields;
