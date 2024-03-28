/**
 * Creates element to render modal form to change box or variant or delivery schedule
 *
 * @module app/components/recharge/change-box-modal
 * @requires module:app/form/form-modal-wrapper~FormModalWrapper
 * @requires module:app/lib/icon-button~IconButton
 * @exports SkipChargeModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import FormModalWrapper from "../form/form-modal";
import ChangeBoxModal from "./change-box-modal";
import Button from "../lib/button";

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
  const { admin, name, title, color } = opts;
  return (
    <button
      class={ `b navy dib bg-white bg-animate hover-white hover-bg-navy ${admin ? "w-20" : "w-100 w-20-ns" } pv2 outline-0 mv1 pointer b--navy ba br2 br--left` }
      title="Add Box"
      type="button"
      name="add-box"
      >
        <span class="v-mid di">Add Box Subscription</span>
    </button>
  );
};

/**
 * Options object passed to module:app/components/form-modal~FormModalWrapper
 *
 * @member {object} options
 */
const options = {
  id: "add-box", // form id - matches name in ShowLink which is title.toHandle
  title: "Add Box Subscription",
  color: "orange",
  src: "/api/recharge-create-subscription",
  ShowLink,
  saveMsg: "Creating box subscription ... please be patient, it will take some minutes.",
  successMsg: "Updates have been queued, reloading ...",
  useSession: true, // set up socket.io to get feedback, requires passing a div id for messages
};

export default FormModalWrapper(ChangeBoxModal, options);
