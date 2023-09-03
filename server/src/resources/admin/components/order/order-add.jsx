/**
 * Creates element to render modal form to add an order. This is a stub
 * component with all the work done by {@link
 * module:app/components/order-upsert~UpsertOrderModal|UpsertOrderModal} and is
 * identical to {@link
 * module:app/components/order-edit~EditOrderModal|EditOrderModal} with the
 * exception of not having an order passed to be edited.
 *
 * @module app/components/order-add
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @requires module:app/lib/icon-button~IconButton
 * @requires module:app/components/order-upsert~UpsertOrderModal
 * @exports AddOrderModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import { AddIcon } from "../lib/icon";
import FormModalWrapper from "../form/form-modal";
import UpsertOrderModal from "./order-upsert";
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
      <AddIcon />
    </IconButton>
  );
};

/**
 * Options object passed to module:app/components/form-modal~FormModalWrapper
 *
 * @member {object} options
 */
const options = {
  id: "add-order", // form id
  title: "Add Order",
  color: "navy",
  src: "/api/add-order",
  ShowLink,
  saveMsg: "Saving order ...",
  successMsg: "Successfully saved order, reloading page.",
  maxWidth: "mw9",
  withCloseButton: true,
};

/**
 * Wrapped component {@link module:app/form/form-modal-wrapper~FormModalWrapper|FormModalWrapper}
 *
 * @member {object} AddOrderModal
 */
const AddOrderModal = FormModalWrapper(UpsertOrderModal, options);
export default AddOrderModal;
