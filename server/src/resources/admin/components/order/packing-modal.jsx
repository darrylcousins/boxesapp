/**
 * Creates element to render a modal display in {@link
 * module:app/components/packing-modal~PackingList|PackingList}
 *
 * @module app/components/packing-modal
 * @exports PackingModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal} from "@b9g/crank";
import { PreviewIcon } from "../lib/icon";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";
import { Fetch } from "../lib/fetch";
import ModalTemplate from "../lib/modal-template";

/**
 * Display a modal containing {@link
 * module:app/components/packing-modal~PackingList|PackingList}
 *
 * @generator
 * @yields {Element} DOM element displaying modal
 * @param {object} props Property object
 * @param {object} props.order The order to be displayed
 */
function* PackingModal({ delivered, getUriFilters }) {
  /**
   * Hold visibility state.
   *
   * @member {boolean} visible
   */
  let visible = false;
  /**
   * Hold loading state.
   *
   * @member {boolean} visible
   */
  let loading = true;
  /**
   * The fetched data
   *
   * @member {object} packingData
   */
  let packingData = {};
  /**
   * If fetch returns an error
   *
   * @member {object|string} fetchError
   */
  let fetchError = null;

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
   * Open the modal
   *
   * @function openModal
   */
  const openModal = () => {
    visible = true;
    getPackingList();
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
    if (ev.target && ev.target.tagName === "BUTTTON") {
      visible = !visible;
      this.refresh();
    }
    if (ev.key && ev.key === "Escape") {
      closeModal();
      this.refresh();
    }
  };

  this.addEventListener("click", hideModal);

  this.addEventListener("keyup", hideModal);

  /**
   * Build the rows
   *
   * @function buildRows
   */
  const buildRows = async (json) => {
    const tags = json.settings["product-tags"].split(',').map(el => el.trim()).sort().reverse();
    const data = json.packingData;
    return {data, tags};
  };

  /**
   * Get the picking list data
   *
   * @function getBoxesGroupedByDate
   */
  const getPackingList = async () => {
    let uri = getUriFilters(`/api/packing-list/${new Date(delivered).getTime()}`, false);
    await Fetch(uri)
      .then(async (result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          loading = false;
          const { data, tags } = await buildRows(json);
          packingData = data;
          this.refresh();
        }
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
      });
  };

  const main = document.getElementById("modal-window");

  for ({ delivered, getUriFilters } of this) { // eslint-disable-line no-unused-vars
    yield (
      <Fragment>
        <button
          class={`dib w-20 outline-0 purple b--dark-green bt bb br bl-0 bg-transparent mv1 pointer`}
          title="Preview packing list"
          type="button"
          onclick={openModal}
          >
            <span class="v-mid di">Packing List</span>
            <span class="v-mid">
              <PreviewIcon />
            </span>
        </button>
        {visible && (
          <Portal root={main}>
            <ModalTemplate closeModal={ closeModal } loading={ loading } error={ fetchError }>
              <h6 class="fw4 tl fg-streamside-maroon">Packing List Preview { delivered }</h6>
                { packingData.boxes && (
                  <div class="ph4 pb4">
                    <div class="fw6 bb b--black-20 mb3">
                      <div class="flex pr3">
                        <div>
                          Total Boxes
                        </div>
                        <div class="ml3 tr">
                          { packingData["total-boxes"] }
                        </div>
                      </div>
                      <div class="flex tl">
                        <div>
                          Custom Boxes
                        </div>
                        <div class="ml3 tr">
                          { packingData["custom-boxes"] }
                        </div>
                      </div>
                    </div>
                    <div class="cf"></div>
                    <div class="overflow-auto flex items-start">
                      { Object.entries(packingData.boxes).map(([title, box]) => (
                        <table class="w-100 mw8 center" cellspacing="0">
                          <thead>
                            <tr>
                              <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">{ title }</th>
                              <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">{ box.count }</th>
                            </tr>
                          </thead>
                          <tbody class="lh-copy">
                            { box.products.map((product, idx) => (
                              <tr>
                                <td crank-key={ `${product}-${idx}` }
                                  class="pv1 pr3 bb b--black-20">{ product }</td>
                                <td crank-key={ `${product}-${idx}-empty` }
                                  class="pv1 pr3 bb b--black-20">&nbsp;</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ))}
                    </div>
                  </div>
                )}
            </ModalTemplate>
          </Portal>
        )}
      </Fragment>
    );
  };
}

export default PackingModal;
