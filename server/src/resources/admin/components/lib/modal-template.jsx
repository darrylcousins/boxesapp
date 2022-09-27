/**
 * Creates element to render a modal
 *
 * @module app/components/modal-template
 * @exports ModalTemplate
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import { CloseIcon } from "../lib/icon";
import Button from "../lib/button";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";

/**
 * Display a modal containing {@link
 * module:app/components/picking-modal~PickingList|PickingList}
 *
 * @generator
 * @yields {Element} DOM element displaying modal
 * @param {object} props Property object
 * @param {object} props.children The children
 * @param {object} props.closeModal The close method to attach to close buttons

        style={`left: 0; top: 0px; background: rgba(0, 0, 0, 0.9); overflow: scroll; top: ${Math.round(window.scrollY).toString()}px;`}
 */
function* ModalTemplate({ children, closeModal, error, loading, withClose, withCloseButton, maxWidth }) {

  for ({ children, closeModal, error, loading, withClose, withCloseButton, maxWidth } of this) { // eslint-disable-line no-unused-vars
    const mw = (typeof maxWidth === "string") ? maxWidth : "mw9";
    yield (
      <div
        class="db absolute absolute--fill w-100 h-100 z-max pa4 mv4"
        style={`background: rgba(0, 0, 0, 0.9); overflow: scroll;`}
      >
        <div class="fixed absolute--fill h-100 w-100 pv4 flex items-start"
          style="background: rgba(0, 0, 0, 0.9); overflow: scroll">
          <div class={ `w-100 w-80-ns bg-white pa4 br3 ${ mw } mt5 mb8 relative center` }>
            { (typeof withCloseButton === "undefined" || withCloseButton) && (
              <button
                class="bn bg-transparent outline-0 mid-gray dim o-70 absolute top-1 right-1 pointer"
                name="close"
                onclick={closeModal}
                title="Close info"
                type="button"
              >
                <CloseIcon />
                <span class="dn">Close modal</span>
              </button>
            )}
            { children }
            {(error && error !== null) && <Error msg={error} />}
            {loading && <BarLoader />}
            { (typeof withClose === "undefined" || withClose) && (
              <div class="w-100 tr">
                <Button
                  type="secondary"
                  title="Close window"
                  onclick={closeModal}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
}

export default ModalTemplate;
