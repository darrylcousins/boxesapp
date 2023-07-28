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
  const range = 5;
  const maxRange = 15;
  const spaceClass = "ph4 pv1";

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

  const getButtons = ({start, end}) => {
    const buttons = [];
    let fg, bg;
    // if pageCount > 15, only show first and last 5 buttons, with ellipses between
    for (let count = start; count <= end; count++) {
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
      buttons.push(
       <button
         title={count}
         name={count}
         type="button"
         class={`${fgColour} b--${fgColour} ${bg} ${spaceClass} dim pointer ${getBorders(position)}`}
       >{ count }</button>
      );
    };
    return buttons;
  };

  const getPageButtons = () => {
    // if pageCount > maxRange, only show first and last 5 buttons, with ellipses between
    // if pageNumber between range and pageCount - range then show first and last and the 5 between
    if (pageCount < maxRange) {
      return getButtons({ start: 1, end: pageCount});
    } else {
      const ellipses = (
       <button
         title=" ... "
         name=" ... "
         type="button"
         class={`disable ${fgColour} b--${fgColour} ${bgColour} pv1 pb0 ph5 ${getBorders("middle")}`}
       > ... </button>
      );
      if (pageNumber <= range || pageNumber >= (pageCount - range + 1)) {
        return [
          ...getButtons({ start: 1, end: range }),
          ellipses,
          ...getButtons({ start: pageCount - range + 1, end: pageCount})
        ];
      } else {
        return [
          ...getButtons({ start: 1, end: 1 }),
          ellipses,
          ...getButtons({ start: pageNumber - 2, end: pageNumber + 2 }),
          ellipses,
          ...getButtons({ start: pageCount, end: pageCount})
        ];
      };
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

  const nextPreviousClass = (direction) => {
    return `${fgColour} b--${fgColour} ${bgColour} ${spaceClass} dim pointer ${getBorders(direction)}`;
  };

  for ({pageCount, pageNumber} of this) {
    yield (
      pageCount === 1 ? "" : (
        <div class="dib">
          <span class="mr5 b">Page {pageNumber} of {pageCount}</span>
          { pageNumber > 1 && (
            <button
              title="Previous"
              name={pageNumber - 1}
              type="button"
              class={nextPreviousClass("left")}
            >Previous</button>
          )}
          {getPageButtons()}
          { pageNumber < pageCount && (
            <button
              title="Next"
              type="button"
              name={parseInt(pageNumber) + 1}
              class={nextPreviousClass("right")}
            >Next</button>
          )}
        </div>
      )
    )
  };
};

export default Pagination;
