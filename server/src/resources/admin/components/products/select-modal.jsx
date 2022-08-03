/**
 * Creates element to render a modal display in {@link
 * module:app/components/packing-modal~PackingList|PackingList}
 *
 * @module app/components/packing-modal
 * @exports PackingModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal} from "@b9g/crank";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";
import Button from "../lib/button";
import { Fetch } from "../lib/fetch";
import ModalTemplate from "../lib/modal-template";
import { selectProductEvent } from "../lib/events";
import { sortObjectByKeys, toPrice } from "../helpers";

/**
 * Display a modal containing {@link
 * module:app/components/packing-modal~PackingList|PackingList}
 *
 * @generator
 * @yields {Element} DOM element displaying modal
 * @param {object} props Property object
 * @param {object} props.modalSelectList The list to be displayed and selected from
 * @param {object} props.modalNote The note to display
 * @param {object} props.modalType Confirm or select
 * @param {object} props.hideModal Method to close the modal
 */
function* SelectModal({ modalNote, modalType, modalSelectList, hideModal }) {

  /*
   * hold the selected product in the list
   */
  let selectedProductId = null;
  if (modalSelectList && modalSelectList.length === 1) {
    selectedProductId = modalSelectList[0].shopify_product_id;
  }
  /*
   * hold the selected product in the list
   */
  let selectedProduct = null;

  const groupProducts = (products) => {
    const grouped = {};
    let tag;
    for (const product of products) {
      tag = product.shopify_tags[0];
      if (!Object.hasOwnProperty.call(grouped, tag)) {
        grouped[tag] = [];
      };
      grouped[tag].push(product);
    };

    return sortObjectByKeys(grouped, {reverse: true});
  };

  /**
   * Handle mouse up on selected components
   *
   * @function handleMouseUp
   * @param {object} ev The firing event
   * @listens click
   */
  const handleClick = (ev) => {
    let target;
    if (["INPUT", "LABEL", "SPAN"].includes(ev.target.tagName)) {

      if (ev.target.tagName === "INPUT") {
        target = ev.target;
      } else if (ev.target.tagName === "LABEL") {
        target = ev.target.querySelector("input");
      } else if (ev.target.tagName === "SPAN") {
        target = ev.target.parentElement.querySelector("input");
      };

      const value = parseFloat(target.value);
      selectedProductId = value;
      selectedProduct = modalSelectList.filter(el => el && el)
        .find(el => el.shopify_product_id === selectedProductId);
      if (selectedProduct.quantity > 1) {
        // XXX what was this?
        console.log('MUST NOW MAKE A NOTE OF THE QUANTITY', selectedProduct.quantity, selectedProduct.shopify_title);
      };
      this.refresh();
    };
  };

  /**
   * Handle confirmation of selection
   *
   * @function confirmSelection
   * @param {object} ev The firing event
   */
  const confirmSelection = async (ev) => {
    // selectedProductId will be null if only as a confirmation modal
    await this.dispatchEvent(selectProductEvent(selectedProductId));
  };

  const main = document.getElementById("front-modal-window");

  for ({ modalNote, modalType, modalSelectList, hideModal } of this) { // eslint-disable-line no-unused-vars
    yield (
      <Portal root={main}>
        <ModalTemplate closeModal={ hideModal } loading={ false } error={ false } withClose={ false }>
          <div class="mb4">
            { modalNote }
          </div>
          { modalSelectList ? (
            <Fragment>
              { modalSelectList.length === 100 ? (
                <div class="flex justify-between">
                  <label class="pointer items-center" style="font-size: 1em">
                    { modalSelectList[0].shopify_title } { modalSelectList[0].quantity > 1 && `(${modalSelectList[0].quantity})` }
                  </label>
                  { modalType === "add" && (
                    <div>
                      <div>
                        <span>{ toPrice(product.shopify_price) }</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                modalSelectList.map(product => (
                  <div class="flex justify-between">
                    { product ? (
                      <Fragment>
                        <label class="pointer items-center" style="font-size: 1em; margin-bottom: 0px;">
                          <input 
                            onclick={ handleClick }
                            checked={ selectedProductId === product.shopify_product_id }
                            class="mr2"
                            type="radio"
                            id={ product.shopify_product_id }
                            value={ product.shopify_product_id }
                            name="product" />
                            { product.shopify_title } { product.quantity > 1 && `(${product.quantity})` }
                        </label>
                        { modalType === "add" && (
                          <div>
                            <div>
                              <span>{ toPrice(product.shopify_price) }</span>
                            </div>
                          </div>
                        )}
                      </Fragment>
                    ) : (
                      <div>&nbsp;</div>
                    )}
                  </div>
                ))
              )}
              { selectedProduct && selectedProduct.quantity > 1 && (
                <div class="w-100">
                  <p class="bold">
                    Only one { selectedProduct.shopify_title } will be removed, the remainder will be moved to your add ons.
                  </p>
                </div>
              )}
              <div class="w-100 tr">
                { (selectedProductId || modalSelectList.length ===1) && (
                  <Button
                    onclick={ confirmSelection }
                    type="primary">
                    Confirm
                  </Button>
                )}
                <Button
                  onclick={ hideModal }
                  border="black"
                  type="transparent/light">
                  Cancel
                </Button>
              </div>
            </Fragment>
          ) : (
            <Fragment>
              <div class="dt w-100">
                <div class="dtc w-50 tr">
                  <Button
                    onclick={ hideModal }
                    border="black"
                    type="transparent/light">
                    Cancel
                  </Button>
                </div>
                <div class="dtc w-50 tl">
                  <Button
                    onclick={ confirmSelection }
                    type="primary">
                    Confirm
                  </Button>
                </div>
              </div>
            </Fragment>
          )}
        </ModalTemplate>
      </Portal>
    );
  };
}

export default SelectModal;
