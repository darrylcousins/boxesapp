import { createElement } from "@b9g/crank";
/*
 * @function Help
 * @param {string/integer} id of the div
 */
export const Help = ({ id }) => {
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
    <div style="font-weight: 700; cursor:pointer">
      <div style="display: inline"
        onmouseover={ showHelp }
        onmouseout={ hideHelp }
      >&#63;</div></div>
  );
};
