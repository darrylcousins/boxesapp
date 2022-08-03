/**
 * A component that onclick becomes an editable field
 *
 *  <ContentEditable
 *    placeholder={<div class="dib">{somevalue}</div>}>
 *    <input
 *      type="text"
 *      value={somevalue} />
 *  </ContentEditable>
 *
 * @module app/components/contenteditable
 * @exports CollapseAnimator
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

/**
 * An editable text component
 *
 * @function ContentEditable
 * @returns {Element} Return the element
 */
function *ContentEditable({children, placeholder}) {

  /**
   * Hold editing state.
   *
   * @member {boolean} editing
   */
  let editing = false;

  this.addEventListener("click", () => {
    editing = true;
    this.refresh();
  });
  for (const _ of this) {
    yield (
      <Fragment>
        {!editing ? placeholder : children}
      </Fragment>
    )
  };
}

export default ContentEditable;