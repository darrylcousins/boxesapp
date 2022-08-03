/**
 * Creates element to render a modal display in {@link
 * module:app/components/packing-modal~PackingList|PackingList}
 *
 * @module app/components/packing-modal
 * @exports PackingModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Portal} from "@b9g/crank";
import ModalTemplate from "../lib/modal-template";

/**
 * Display a modal containing {@link
 * module:app/components/recharge/action-modal~ActionModal|ActionModal}
 *
 * @generator
 * @yields {Element} DOM element displaying modal
 * @param {object} props Property object
 * @param {Element} props.modalChildren The content
 * @param {object} props.hideModal Method to close the modal
 */
function* ActionModal({ modalChildren, hideModal }) {


  const main = document.getElementById("modal-window");

  for ({ modalChildren, hideModal } of this) { // eslint-disable-line no-unused-vars
    yield (
      <Portal root={main}>
        <ModalTemplate closeModal={ hideModal } loading={ false } error={ false } withClose={ false }>
          { modalChildren }
        </ModalTemplate>
      </Portal>
    );
  };
};

export default ActionModal;
