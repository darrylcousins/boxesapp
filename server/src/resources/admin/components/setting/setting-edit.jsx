/**
 * Creates element to render modal form to add a setting. This is a stub
 * component with all the work done by {@link
 * module:app/components/setting-upsert~UpsertSettingModal|UpsertSettingModal} and is
 * identical to {@link
 * module:app/components/setting-add~AddSettingModal|AddSettingModal} with the
 * exception of having a setting passed to be edited.
 *
 * @module app/components/setting-edit
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @requires module:app/lib/icon-button~IconButton
 * @requires module:app/components/setting-upsert~UpsertSettingModal
 * @exports EditSettingModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";

import FormModalWrapper from "../form/form-modal";
import UpsertSettingModal from "./setting-upsert";
import { EditIcon } from "../lib/icon";
import IconButton from "../lib/icon-button";

/**
 * Icon button for link to expand modal
 *
 * @function ShowLink
 * @param {object} opts Options that are passed to {@link module:app/lib/icon-button~IconButton|IconButton}
 * @param {string} opts.name Name as identifier for the action
 * @param {string} opts.title Hover hint
 * @param {string} opts.color Icon colour
 * @returns {Element} An icon button
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
  id: "edit-setting", // form id
  title: "Edit Setting", // titles
  color: "navy", // icon/link color
  src: "/api/edit-setting", // where PostFetch sends data to
  ShowLink, // Element, button or link to open modal
  saveMsg: "Updating setting ...", // message on saving
  successMsg: "Successfully updated setting, reloading page.", // message on success
};

export default FormModalWrapper(UpsertSettingModal, options);
