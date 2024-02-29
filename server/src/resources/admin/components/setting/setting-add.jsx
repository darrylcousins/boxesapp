/**
 * Creates element to render modal form to add a setting. This is a stub
 * component with all the work done by {@link
 * module:app/components/setting-upsert~UpsertSettingModal|UpsertSettingModal} and is
 * identical to {@link
 * module:app/components/setting-edit~EditSettingModal|EditSettingModal} with the
 * exception of not having an setting passed to be edited.
 *
 * @module app/components/setting-add
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @requires module:app/lib/text-button~TextButton
 * @requires module:app/components/setting-upsert~UpsertSettingModal
 * @exports AddSettingModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";

import FormModalWrapper from "../form/form-modal";
import UpsertSettingModal from "./setting-upsert";
import Button from "../lib/button";

/**
 * Text button for link to expand modal
 *
 * @function ShowLink
 * @param {object} opts Options that are passed to {@link module:app/lib/text-button~TextButton|TextButton}
 * @param {string} opts.name Name as identifier for the action
 * @param {string} opts.title Hover hint
 * @param {string} opts.color Text colour
 * @param {Function} opts.showModal Action to display modal
 * @returns {Element} A button
 */
const ShowLink = (opts) => {
  const { name, title, color, showModal } = opts;
  return (
    <div class="w-100 tr mr4">
      <Button type="primary" title="Add Setting" name={name}>
        <span class="b">
          Add Setting
        </span>
      </Button>
    </div>
  );
};

/**
 * Options object passed to module:app/components/form-modal~FormModalWrapper
 *
 * @member {object} options
 */
const options = {
  id: "add-setting", // form id
  title: "Add Setting", // titles
  color: "gray", // icon/link color
  src: "/api/add-setting", // where PostFetch sends data to
  ShowLink, // Element, button or link to open modal
  saveMsg: "Updating setting ...", // message on saving
  successMsg: "Successfully added setting, reloading page.", // message on success
};

export default FormModalWrapper(UpsertSettingModal, options);
