/**
 * Creates element to render a modal display of subscription logs
 *
 * @module app/components/logs-modal
 * @exports LogsModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal} from "@b9g/crank";
import Button from "../lib/button";
import ModalTemplate from "../lib/modal-template";
import { formatMeta, dateString } from "./helpers";

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
                <div class="w-80">
                  <h3 class="tl mb0 w-100 fg-streamside-maroon">
                    Logged activity for { box_title }
                  </h3>
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
                       <div class="dib b w-30">{ dateString(log) }</div>
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

