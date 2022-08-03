/**
 * Creates element to render modal form for deleting boxes
 *
 * @module app/components/boxes-remove
 * @requires module:app/form/form~Form
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @exports RemoveBoxes
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

import Error from "../lib/error";
import BarLoader from "../lib/bar-loader";
import Button from "../lib/button";
import { DeleteIcon } from "../lib/icon";
import { PostFetch } from "../lib/fetch";
import IconButton from "../lib/icon-button";
import FormModalWrapper from "../form/form-modal";
import Form from "../form";

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
      <DeleteIcon />
    </IconButton>
  );
};

/**
 * Options object passed to module:app/components/form-modal-wrapper~FormModalWrapper
 *
 * @member {object} options
 */
const options = {
  id: "remove-boxes", // form id
  title: "Remove Boxes",
  color: "dark-red",
  src: "/api/remove-boxes",
  ShowLink,
  saveMsg: "Removing boxes ...",
  successMsg: "Successfully removed X boxes, reloading page.",
};

/**
 * Create a modal to remove a set of boxes matching a delivery date
 *
 * @generator
 * @yields {Element} A form and save/cancel buttons.
 * @param {object} props Property object
 * @param {Function} props.doSave - The save action
 * @param {Function} props.closeModal - The cancel and close modal action
 * @param {string} props.title - Form title
 * @param {object} props.order - The order (or null if adding) to be edited
 * @param {string} props.delivered - The delivery date as a string
 * @param {string} props.formId - The unique form indentifier
 */
async function* RemoveBoxes(props) {
  const { doSave, closeModal, title, delivered, formId } = props;
  
  /**
   * Fields of the form
   * * `delivered`: Delivery date of boxes to be removed
   *
   * @member {object} fields
   */
  const fields = {
    Delivered: {
      id: "delivered",
      type: "hidden",
      datatype: "string",
    },
  };

  for await (const _ of this) { // eslint-disable-line no-unused-vars

    /**
     * The initial form data - required by {@link
     * module:app/form/form~Form|Form}.  If an order supplied returns the order
     * else compiles reasonable defaults.
     *
     * @function getInitialData
     * @returns {object} The initial form data
     */
    const getInitialData = () => ({ delivered });

    /*
     * Data passed to form to create the toast message to user on doSave of form
     * These values can be arbitary provided that match the template string
     */
    const toastTemplate = {
      template: "Removed all boxes from ${delivered}.",
      delivered,
    };

    yield (
      <Fragment>
        <div class="w-100 center ph1">
          <h5>{delivered}</h5>
          <p class="lh-copy near-black tl">
            Delete <strong>all</strong> boxes for this delivery date {delivered}?
          </p>
          <Form
            data={getInitialData()}
            fields={fields}
            title={title}
            id={formId}
            meta={toastTemplate}
          />
          <div class="tr">
            <Button type="primary" onclick={doSave}>
              Delete Boxes
            </Button>
            <Button type="secondary" onclick={closeModal}>
              Cancel
            </Button>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default FormModalWrapper(RemoveBoxes, options);
