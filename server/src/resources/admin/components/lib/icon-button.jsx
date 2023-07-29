/**
 * Icon button module
 *
 * @module app/lib/icon-button
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";

/**
 * IconButton component, will normally have an eventListener attached to parent
 * component as in example below.
 *
 * @returns {Element} DOM component
 * @param {object} props  Component properties
 * @param {Element} props.children Nested child icon for display
 * @param {string} props.color Icon colour
 * @param {string} props.title Button title - hover hint and hidden span
 * @param {string} props.name Button name attribute
 * @example
 * const name = "download";
 * const title = "Download";
 * const color = "dark-gray";
 * const props = {name, color, title};
 * this.addEventListener("click", async (ev) => {
 *   // are we on the right target??
 *   if (ev.target.closest(`button[name='${name}']`)) {
 *     doDownload();
 *   }
 * });
 * <IconButton {...props}>
 *   <DownloadIcon />
 * </IconButton>
 */
const IconButton = (props) => {
  const { children, color, title, name, id } = props;
  const elId = id ? id : `${name.toLowerCase().replace(/ /g, "-")}${`${Math.random()}`.split(".")[1]}`;
  return (
    <button
      class={`pointer bn bg-transparent outline-0 ${color} dib dim pa0`}
      name={name}
      title={title}
      type="button"
      id={elId}
    >
      {children}
      <span class="dn">{title}</span>
    </button>
  );
};

export default IconButton;
