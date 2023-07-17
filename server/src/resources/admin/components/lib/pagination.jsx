/**
 * Pagination buttons for data
 *
 * @module app/lib/pagination
 * @exports Pagination
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";

/**
 * Pagination
 *
 * @function
 * @returns {Element} DOM component
 * @example
 * import {renderer} from '@b9g/crank/dom';
 * renderer.render(<Pagination />, document.querySelector('#app'))
 */
function *Pagination({callback, pageCount, pageNumber}) {

  const bgColour = "bg-transparent";
  const fgColour = "dark-gray";

  const getBorders = (position) => {
    let borders = "ba";
    if (position === "left") borders = "bb bl bt br-0 br2 br--left";
    if (position === "middle") borders = "bb br bt bl-0";
    if (position === "middle-left") borders = "ba";
    if (position === "middle-right") borders = "bb br bt bl-0";
    if (position === "right") borders = "br bt bb bl-0 br2 br--right";
    if (position === "single") borders = "ba br2";
    return borders;
  };

  const spaceClass = "ph3 pv1";
  console.log(pageNumber, pageCount);

  const getPageButtons = () => {
    const pageButtons = [];
    let fg, bg;
    for (let count = 1; count <= pageCount; count++) {
      let position;
      switch(count) {
        case 1:
          position = pageNumber === 1 ? "left" : "middle-left";
          break;
        case pageCount:
          position = pageNumber === pageCount ? "right" : "middle-right";
          break;
        default:
          position = pageNumber === 1 && count === pageNumber + 1 ? "middle-left" : "middle";
          break;
      };
      bg = pageNumber === count ? "bg-moongray" : bgColour;
      console.log(bg);
      pageButtons.push(
       <button
         title={count}
         name={count}
         type="button"
         class={`${fgColour} b--${fgColour} ${bg} ${spaceClass} dim pointer ${getBorders(position)}`}
       >{ count }</button>
      );
    };
    return pageButtons;
  };


  const clickEvent = async (ev) => {
    let target = ev.target;
    const name = target.tagName.toUpperCase();
    if (name === "BUTTON") {
      callback({pageTarget: target.getAttribute("name")});
      target.blur();
    };
  };

  this.addEventListener("click", clickEvent);

  for ({pageCount, pageNumber} of this) {
    yield (
      pageCount === 1 ? "" : (
        <div class="dib">
          <span class="mr3">Page {pageNumber} of {pageCount}</span>
          { pageNumber > 1 && (
            <button
              title="Previous"
              name={pageNumber - 1}
              type="button"
              class={`${fgColour} b--${fgColour} ${bgColour} ${spaceClass} dim pointer ${getBorders("left")}`}
            >Previous</button>
          )}
          {getPageButtons()}
          { pageNumber < pageCount && (
            <button
              title="Next"
              type="button"
              name={parseInt(pageNumber) + 1}
              class={`${fgColour} b--${fgColour} ${bgColour} ${spaceClass} dim pointer ${getBorders("right")}`}
            >Next</button>
          )}
        </div>
      )
    )
  };
};

export default Pagination;
