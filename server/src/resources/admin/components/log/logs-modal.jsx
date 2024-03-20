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
import { Fetch } from "../lib/fetch";

/**
 * Display a modal containing {@link
 * module:app/components/order-detail~OrderDetail|OrderDetail}
 *
 * @generator
 * @yields {Element} DOM element displaying modal
 * @param {object} props Property object
 * @param {object} props.order The order to be displayed
 */
async function* LogsModal({ customer_id, subscription_id, box_title, admin }) {
  /**
   * Hold visibility state.
   *
   * @member {boolean} visible
   */
  let visible = false;
  /**
   * Hold loading state.
   *
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * Hold fetchError
   *
   * @member {boolean} fetchError
   */
  let fetchError = false;
  /**
   * The fetched logs
   *
   * @member {array} fetchLogs
   */
  let fetchLogs = [];

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
      if (visible) {
        loading = true;
        this.refresh();
        await getLogs();
      } else {;
        this.refresh();
      };
    };
  };

  this.addEventListener("click", hideModal);

  this.addEventListener("keyup", hideModal);

  const main = document.getElementById("modal-window");

  /*
   * @function getLogs
   * Fetch recent logs for this subscription
   */
  const getLogs = async () => {
    const uri = `/api/customer-logs?customer_id=${customer_id}&subscription_id=${subscription_id}`;
    return Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
          return null;
        };
        // ensure distinct on timestamp (later fixed)
        const logs = [];
        const map = new Map();
        for (const item of json.logs) {
          if(!map.has(item.timestamp)){
            map.set(item.timestamp, true);    // set any value to Map
            logs.push({
              timestamp: item.timestamp,
              message: item.message
            });
          };
        };
        fetchLogs = json.logs;
        loading = false;
        this.refresh();
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
        return null;
      });
    return;
  };

  for await ({ subscription_id, customer_id, box_title } of this) { // eslint-disable-line no-unused-vars
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
            <ModalTemplate closeModal={ closeModal } loading={ loading } error={ fetchError } withClose={ true }>
              <Fragment>
                <div class="w-80">
                  <h3 class="tl mb0 w-100 fg-streamside-maroon">
                    Logged activity for { box_title }
                  </h3>
                  <p class="lh-copy tl mb3 mt2">
                    { !loading && fetchLogs.length === 0 ? (
                      <span>No recent logs stored for this subscription</span>
                    ) : (
                      <span>Recent logs</span>
                    )}
                    <span class="pl1">(logs are only kept for 2 weeks).</span>
                  </p>
                  <ul class="list pl0 mt0">
                   { fetchLogs.map((log) => (
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

