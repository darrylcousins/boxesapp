/**
 * Creates element to render a modal display of subscription logs
 *
 * @module app/components/logs-modal
 * @exports LogsModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal} from "@b9g/crank";
import { CloseIcon } from "../lib/icon";
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
async function* LogsModal({ logs, box_title, admin }) {
  /**
   * Hold visibility state.
   *
   * @member {boolean} visible
   */
  let visible = false;
  /**
   * Possible selections to make on object type
   *
   * @member possibleObjects
   * @type {array}
   */
  let possibleObjects = ["order", "product", "recharge", "shopify"];

  /**
   * Close the modal
   *
   * @function closeModal
   */
  const closeModal = () => {
    visible = false;
    this.refresh();
  };

  /*
   * Helper method to render log.meta
   */
  const formatMeta = (el) => {
    const user = [ "Delivery Date", "title", "topic", "charge_status", "subscription_id", "scheduled_at" ];
    if (!Object.hasOwnProperty.call(el, 'meta')) {
      return <div>&nbsp;</div>;
    };
    if (el.meta === null) {
      return <div>&nbsp;</div>;
    };
    // expecting just one object on meta 'order', 'product', 'customer', 'subscription'?
    const obj = Object.keys(el.meta)[0];
    if (possibleObjects.includes(obj)) {
      let mapper;
      if (admin) {
        mapper = Object.entries(el.meta[obj]);
      } else {
        mapper = Object.entries(el.meta[obj]).filter(([title, str]) => {
          return user.includes(title) ? [title, str] : false;
        });
      };
      return (
        <div class="dt w-100 mv1">
          { mapper.map(([title, str]) => (
              <div class="dt-row w-100">
                <div class="dtc w-30 gray tr pr2">
                  { title }:
                </div>
                <div class="dtc w-70">
                  { (typeof str === "string") ? `${ str }` : `${JSON.stringify(str)}` }
                </div>
              </div>
          ))}
        </div>
      );
    } else {
      return (
        <div class="dt w-100 mv1">
          { Object.entries(el.meta).map(([title, str]) => (
              <div class="dt-row w-100">
                <div class="dtc w-50 gray tr pr2">
                  { title }:
                </div>
                <div class="dtc w-50">
                  { str }
                </div>
              </div>
          ))}
        </div>
      );
    };
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
    if (["SPAN"].includes(target.tagName.toUpperCase())) {
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

  /*
   * Helper method for tidy date strings from timestamp
   */
  const dateString = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.toDateString()} ${date.toLocaleTimeString()}`;
  };

  const main = document.getElementById("modal-window");

  for await ({ logs, box_title } of this) { // eslint-disable-line no-unused-vars
    yield (
      <Fragment>
        <Button type="notice-reverse"
          name="logs"
          title="Logs">
          <span class="b">
            Logs
          </span>
        </Button>
        {visible && (
          <Portal root={main}>
            <ModalTemplate closeModal={ closeModal } loading={ false } error={ false } withClose={ true }>
              <Fragment>
                <div class="w-80 center">
                  <h6 class="tl mb0 w-100 fg-streamside-maroon">
                    Logged activity for { box_title }
                  </h6>
                  <p class="lh-copy tl mb3 mt2">
                    { logs.length === 0 ? (
                      <span>No recent logs stored for this subscription</span>
                    ) : (
                      <span>Recent logs</span>
                    )}
                    <span class="pl1">(logs are only kept for 2 weeks).</span>
                  </p>
                  <ul class="list pl0 mt0">
                   { logs.map((log) => (
                     <li class="dt w-100">
                       <div class="dib b w-30">{ dateString(log.timestamp) }</div>
                       <div class="dib w-70 pl2">
                         <div class="db b i w-100">{ log.message }</div>
                         <div class="dtc db w-100">
                           { formatMeta(log) }
                         </div>
                       </div>
                     </li>
                  ))}
                  </ul>
                </div>
              </Fragment>
            </ModalTemplate>
          </Portal>
        )}
      </Fragment>
    );
  };
}

export default LogsModal;

