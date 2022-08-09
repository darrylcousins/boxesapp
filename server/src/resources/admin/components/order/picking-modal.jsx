/**
 * Creates element to render a modal display in {@link
 * module:app/components/picking-modal~PickingList|PickingList}
 *
 * @module app/components/picking-modal
 * @exports PickingModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal} from "@b9g/crank";
import { PreviewIcon } from "../lib/icon";
import { Fetch } from "../lib/fetch";
import ModalTemplate from "../lib/modal-template";

/**
 * Display a modal containing {@link
 * module:app/components/picking-modal~PickingList|PickingList}
 *
 * @generator
 * @yields {Element} DOM element displaying modal
 * @param {object} props Property object
 * @param {object} props.order The order to be displayed
 */
function* PickingModal({ delivered }) {
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
   * The fetched data as rows for the table
   *
   * @member {array} pickingList
   */
  let pickingList = [];
  /**
   * The fetched tags from General settings
   *
   * @member {array} productTags
   */
  let productTags = [];
  /**
   * The keys of the lists
   *
   * @member {array} listKeys
   */
  let listKeys = ["Including", "Addons", "Swaps", "Custom", "Total"];
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
    getPickingList();
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
    const keys = listKeys.map(el => el.toLowerCase());
    const orphanedTags = Object.keys(json.pickingData).filter(el => !tags.includes(el));
    for (const badTag of orphanedTags) {
      tags.push(badTag);
    };
    let data = [];
    tags.forEach(tag => {
      const rows = Object.entries(json.pickingData[tag]).map(([name, el]) => {
        const row = [name];
        keys.forEach(key => {
          return row.push(el[key]);
        });
        return row;
      })
      if (rows.length) rows.push([]);
      data = [...data, ...rows];
    });
    return {data, tags};
  };

  /**
   * Get the picking list data
   *
   * @function getPickingList
   */
  const getPickingList = () => {
    let uri = `/api/picking-list/${new Date(delivered).getTime()}`;
    Fetch(uri)
      .then(async (result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
        } else {
          loading = false;
          const { data, tags } = await buildRows(json);
          pickingList = data;
          productTags = tags;
          console.log(pickingList);
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

  for ({ delivered } of this) { // eslint-disable-line no-unused-vars
    yield (
      <Fragment>
        <button
          class={`dib w-20 outline-0 blue b--dark-green bt bb br bl-0 bg-transparent mv1 pointer`}
          title="Preview picking list"
          type="button"
          onclick={openModal}
          >
            <span class="v-mid di">Picking List</span>
            <span class="v-mid">
              <PreviewIcon />
            </span>
        </button>
        {visible && (
          <Portal root={main}>
            <ModalTemplate closeModal={ closeModal } loading={ loading } error={ fetchError }>
              <h6 class="fw4 tl fg-streamside-maroon">Picking List Preview { delivered }</h6>
              <div class="pa4">
                <div class="overflow-auto">
                  <table class="w-100 mw8 center" cellspacing="0">
                    <thead>
                      <tr>
                        <th class="fw6 bb b--black-20 tl pb3 pr3 bg-white">Product</th>
                        { listKeys.map(el => (
                          <th crank-key={ el.toLowerCase() } 
                            class="fw6 bb b--black-20 tl pb3 pr3 bg-white">{ el }</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody class="lh-copy">
                      { pickingList.map(row => (
                        (row.length > 0) ? (
                          <tr>
                            { row.map((el, idx) => (
                              <td crank-key={ `${ el }-${ idx }` }
                                class="pv1 pr3 bb b--black-20">{ el }</td>
                            ))}
                            <td class="pv0 pr3 bb b--black-20" colspan="5">&nbsp;</td>
                          </tr>
                        ) : (
                          <tr>
                            <td class="" colspan="5">&nbsp;</td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </ModalTemplate>
          </Portal>
        )}
      </Fragment>
    );
  };
}

export default PickingModal;
