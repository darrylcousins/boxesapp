/**
 * Component
 *
 * @module app/select-menu
 * @exports {Element} SelectMenu
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import TextButton from "./text-button";
import CollapseWrapper from "./collapse-animator";

/**
 * Component
 *
 * @returns {Element} DOM component
 * <SelectMenu id="selectDate" menu={fetchDates} title="Select Date" active={menuSelectDate} />
 */
function *SelectMenu ({ id, active, title, menu, children, style, hideButton }) {

  for ({ id, active, title, menu, children, style, hideButton } of this) {
    yield (
      <Fragment>
        <div class="relative">
          { !hideButton && (
            <button
              class="select-dropdown-button"
              title={title}
              id={id}
              type="button"
              style={style}
              >
              { children }
            </button>
          )}
          { active && (
            <div class="select-dropdown-wrapper">
            {menu.map((el, idx, arr) => (
              <TextButton text={el.text} index={idx} array={arr} name={id} item={el.item} />
            ))}
            </div>
          )}
        </div>
      </Fragment>
    )
  }
};

export default SelectMenu;
