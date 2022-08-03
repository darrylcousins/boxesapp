/**
 * Button module
 *
 * @module app/lib/button
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";

/**
 * Button component
 *
 * @returns {Element} DOM component
 * @param {object} props  Component properties
 * @param {object} props.children Nested child components
 * @param {string} props.type Button style `primary|secondary`
 * @param {string} props.title Button title - hover hint
 */
const Button = (props) => {
  const { children, type, title, hover, border } = props;
  let classList;
  let hint = "";
  let elProps = { ...props };
  delete elProps["hover"];
  delete elProps["border"];
  if (type === "secondary") {
    classList = "b--navy bg-near-white black-70 hover-bg-moon-gray relative";
    classList += border ? ` b--${border}` : " b--navy";
    classList += hover ? ` ${hover}` : " hover-bg-moon-gray";
  } else if (type === "primary") {
    classList = "bg-dark-blue white relative";
    classList += border ? ` b--${border}` : " b--navy";
    classList += hover ? ` ${hover}` : " hover-bg-navy";
  } else if (type === "success") {
    classList = "bg-green white relative";
    classList += border ? ` b--${border}` : " b--dark-green";
    classList += hover ? ` ${hover}` : " hover-bg-dark-green";
  } else if (type.startsWith("transparent")) {
    const [trans, bg] = type.split('/');
    classList = "bg-transparent relative";
    if (border) {
      classList += ` ba b--${border}`;
    } else {
      if (bg === "dark") classList += " ba b--white white"; 
      if (bg === "light") classList += " ba b--black black"; 
    }
    classList += hover ? ` ${hover}` : " dim";
  };
  if (typeof title === "undefined" && typeof children === "string") {
    hint = children.toString();
  } else {
    hint = title;
  }
  return (
    <button
      {...elProps}
      title={hint}
      type="button"
      class={`pointer br2 ba pv2 ph4 ml1 mv1 bg-animate border-box ${classList}`}
    >
      {children}
    </button>
  );
};

export default Button;
