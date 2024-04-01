import { createElement } from "@b9g/crank";
import { QuestionMarkIcon } from "./icon";
/*
 * @function Help
 * @param {string/integer} id of the div
 */
const Help = ({ id, size, title}) => {
  const showHelp = (e) => {
    document.querySelector(`#${id}`).style.display = "block";
    // bit of a bleh here because I've reverted to just using mouseover
    const hide = (e) => {
      const el = document.querySelector(`#${id}`);
      if (el) {
        el.style.display = "none";
      } else {
        window.removeEventListener("click", hide);
      };
    };
    window.addEventListener("click", hide);
  };
  const hideHelp = (e) => {
    document.querySelector(`#${id}`).style.display = "none";
  };
  // size is special and for now only used in EditProducts
  let styleSize = size === "small" ? "1.25em" : "1.35em";
  return (
    <div style="font-weight: 400">
      <div class="dib pointer ph2 pb0 pt2 tr" style="overflow: visible;"
        title={ title ? title : "Info" }
        onmouseover={ showHelp }
        onmouseout={ hideHelp }>
        <span class="v-mid">
          <QuestionMarkIcon styleSize={ styleSize } size={ 25 } view={ 10 } />
        </span>
      </div>
    </div>
  );
};

export default Help;

  /**
   * Help/info for the logs
   *
   * @member Help
   * @type {object}
  const Help = ({id}) => {
    const showHelp = (e) => {
      document.querySelector(`#${id}`).style.display = "block";
      window.addEventListener('click', (e) => {
        document.querySelector(`#${id}`).style.display = "none";
      });
    };
    const hideHelp = (e) => {
      document.querySelector(`#${id}`).style.display = "none";
    };
    return (
      <div style="font-weight: 700;">
        <div class="dib pa2 pointer tr" style="display: inline"
          onmouseover={ showHelp }
          onmouseout={ hideHelp }
        >&#63;</div></div>
    );
  };
   */

