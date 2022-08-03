/**
 * Creates element to render a modal display in {@link
 * module:app/components/order-detail~OrderDetail|OrderDetail}
 *
 * @module app/components/order-modal
 * @exports OrderModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal} from "@b9g/crank";
import { PreviewIcon, CloseIcon } from "../lib/icon";
import IconButton from "../lib/icon-button";
import OrderDetail from "./order-detail";
import Button from "../lib/button";
import ModalTemplate from "../lib/modal-template";

/**
 * Display a modal containing {@link
 * module:app/components/order-detail~OrderDetail|OrderDetail}
 *
 * @generator
 * @yields {Element} DOM element displaying modal
 * @param {object} props Property object
 * @param {object} props.order The order to be displayed
 */
async function* OrderModal({ order }) {
  /**
   * Hold visibility state.
   *
   * @member {boolean} visible
   */
  let visible = false;

  /**
   * Close the modal
   *
   * @function closeModal
   */
  const closeModal = () => {
    visible = false;
    this.refresh();
  };

  /**
   * Hide the modal
   *
   * @function hideModal
   * @param {object} ev Event emitted
   * @listens window.click
   * @listens window.keyup
   */
  const hideModal = async (ev) => {
    if (ev.key && ev.key === "Escape") {
      closeModal();
      return;
    };
    let target = ev.target;
    if (["PATH", "SVG"].includes(target.tagName.toUpperCase())) {
      target = target.closest("button");
      if (!target) return;
    };
    const name = target.tagName.toUpperCase();
    if (ev.target && name === "BUTTON") {
      visible = !visible;
      this.refresh();
    };
  };

  this.addEventListener("click", hideModal);

  this.addEventListener("keyup", hideModal);

  const main = document.getElementById("modal-window");

  for await ({ order } of this) { // eslint-disable-line no-unused-vars
    yield (
      <Fragment>
        <IconButton color="dark-blue" title="Show details" name={name}>
          <PreviewIcon />
        </IconButton>
        {visible && (
          <Portal root={main}>
            <ModalTemplate closeModal={ closeModal } loading={ false } error={ false } withClose={ true }>
              <OrderDetail order={order} />
            </ModalTemplate>
          </Portal>
        )}
      </Fragment>
    );
  };
}

export default OrderModal;
