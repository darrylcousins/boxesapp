/**
 * Creates element to render modal form to edit an order. This is a stub
 * component with all the work done by {@link
 * module:app/components/order-upsert~UpsertOrderModal|UpsertOrderModal} and is
 * identical to {@link
 * module:app/components/order-add~AddOrderModal|AddOrderModal} with the
 * exception of having an order passed to be edited.
 *
 * @module app/components/order-edit
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @requires module:app/lib/icon-button~IconButton
 * @requires module:app/components/order-upsert~UpsertOrderModal
 * @exports EditOrderModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";

import FormModalWrapper from "../form/form-modal";
import UpsertOrderModal from "./order-upsert";
import { EditIcon } from "../lib/icon";
import IconButton from "../lib/icon-button";

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
      <EditIcon />
    </IconButton>
  );
};

/**
 * Options object passed to module:app/components/form-modal~FormModalWrapper
 *
 * @member {object} options
 */
const options = {
  id: "edit-order", // form id
  title: "Edit Order", // titles
  color: "navy", // icon/link color
  src: "/api/edit-order", // where PostFetch sends data to
  ShowLink, // Element, button or link to open modal
  saveMsg: "Updating order ...", // message on saving
  successMsg: "Successfully updated order, reloading page.", // message on success
  maxWidth: "mw9",
};

/**
 * Wrapped component
 *
 * @member {object} EditOrderModal
 */
const EditOrderModal = FormModalWrapper(UpsertOrderModal, options);
export default EditOrderModal;
