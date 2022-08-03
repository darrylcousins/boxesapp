/**
 * Creates element to render modal form for deleting orders. This includes
 * making a selection of order `sources` to remove, i.e. all `CSA` orders only
 * leaving `Shopify` orders which are removed via webhook when they are marked
 * as `fulfilled` in the Shopify admin.
 *
 * @module app/components/orders-remove
 * @requires module:app/form/form~Form
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @exports RemoveOrders
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

import Error from "../lib/error";
import BarLoader from "../lib/bar-loader";
import Button from "../lib/button";
import { CopyIcon } from "../lib/icon";
import { Fetch } from "../lib/fetch";
import IconButton from "../lib/icon-button";
import FormModalWrapper from "../form/form-modal";
import Form from "../form";
import { dateStringForInput } from "../helpers";

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
    <IconButton color={color} title={title} name={name}>
      <CopyIcon />
    </IconButton>
  );
};

/**
 * Options object passed to module:app/components/form-modal-wrapper~FormModalWrapper
 *
 * @member {object} options
 */
const options = {
  id: "duplicate-boxes", // form id
  title: "Duplicate Boxes",
  color: "fg-streamside-maroon",
  src: "/api/duplicate-boxes",
  ShowLink,
  saveMsg: "Saving boxes ...",
  successMsg: "Successfully duplicated boxes, reloading page.",
};

/**
 * Get the fields, this includes the sources. May also return error if fetch fails.
 *
 * @see {@link module:app/components/orders-remove~fields|fields}
 * @param {string} delivered Delivery date as string
 * @returns {object} Error (if any) and the fields
 */
const getDuplicateFields = async (date) => {
  const uri = `/api/current-boxes-by-date/${new Date(date).getTime()}`;
  const { error, json } = await Fetch(uri)
    .then((result) => result)
    .catch((e) => ({
      error: e,
      json: null,
    }));
  const fields = {};
  if (!error) {
    fields.Delivered = {
      id: "delivered",
      type: "date", // needs to be calendar select
      size: "50",
      datatype: "date",
      required: true,
      min: dateStringForInput(date),
    };
    fields.currentDate = {
      id: "currentDate",
      type: "hidden",
      required: true,
      datatype: "string",
    };
    fields.Boxes = {
      id: "boxes",
      type: "checkbox-multiple",
      size: "100",
      multiple: true,
      datatype: "array",
      datalist: json.boxes.map(el => el.shopify_title),
    };
  };
  return { error, fields };
};

/**
 * Create a modal to duplicate a set of boxes
 *
 * @generator
 * @yields {Element} A form and save/cancel buttons.
 * @param {object} props Property object
 * @param {Function} props.doSave - The save action
 * @param {Function} props.closeModal - The cancel and close modal action
 * @param {string} props.title - Form title
 * @param {string} props.delivered - The current delivery date as a string
 * @param {string} props.formId - The unique form indentifier
 */
async function* DuplicateBoxes(props) {
  const { doSave, closeModal, title, currentDate, formId } = props;


  /**
   * Hold loading state.
   *
   * @member {boolean} loading
   */
  let loading = false;
  /**
   * Hold error state.
   *
   * @member {boolean} error
   */
  let error = false;

  for await (const _ of this) { // eslint-disable-line no-unused-vars
    yield <BarLoader />;

    /**
     * Fields of the form
     * * `delivered`: Delivery date of orders to be removed
     * * `sources`: Source type to remove `Shopify|CSA|BuckyBox`
     *
     * @see {@link module:app/components/orders-remove~getRemoveFields|getRemoveFields}
     * @member {object} fields
     */
    const { error, fields } = await getDuplicateFields(currentDate);

    /**
     * The initial form data - required by {@link
     * module:app/form/form~Form|Form}.  If an order supplied returns the order
     * else compiles reasonable defaults.
     *
     * @function getInitialData
     * @returns {object} The initial form data
     */
    const getInitialData = () => ({ currentDate });

    /*
     * Data passed to form to create the toast message to user on doSave of form
     * These values can be arbitary provided that match the template string
     */
    const toastTemplate = {
      template: "Duplicated boxes.",
    };

    yield (
      <Fragment>
        {error ? (
          <Error msg={fetchError} />
        ) : (
          <Fragment>
            <div class="near-black">
              <p class="lh-copy tl dark-grey">
                Duplicating boxes from { currentDate }.
              </p>
              <p class="lh-copy tl">
                Select a delivery date for the duplicate boxes.
              </p>
            </div>
            <div class="w-100 center ph1">
              <Form
                data={getInitialData()}
                fields={fields}
                title={title}
                id={formId}
                meta={toastTemplate}
              />
              <div class="tr">
                <Button type="primary" onclick={doSave}>
                  Duplicate Boxes
                </Button>
                <Button type="secondary" onclick={closeModal}>
                  Cancel
                </Button>
              </div>
            </div>
          </Fragment>
        )}
      </Fragment>
    );
  }
}

export default FormModalWrapper(DuplicateBoxes, options);
