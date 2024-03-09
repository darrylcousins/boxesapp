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
  // how to make a selected option? i.e. equuivalent to the hover?
  let { children, type, title, hover, border, selected, classes } = props;
  let classList;
  let hint = "";
  let elProps = { ...props };
  delete elProps.classes;
  // doh, why?
  delete elProps["hover"];
  delete elProps["border"];

  // pretty dodgy territory here, needs improvement - see first attempt with recharge/change-box-modal
  if (selected && type.startsWith("alt")) {
    type = type.split("-")[1];
  };

  // this needs a tidy up! On some hover is included and not on others for example
  // Search for instances and check if hover or border are used!
  if (type === "secondary") {
    classList = "b--navy bg-near-white black-70 hover-bg-moon-gray relative";
    classList += border ? ` b--${border}` : " b--navy";
    classList += hover ? ` ${hover}` : " hover-bg-moon-gray";
  } else if (type === "alt-secondary") { // lighter
    classList = "b--black-70 bg-white black-70 hover-bg-near-white relative";
    classList += border ? ` b--${border}` : " b--black-70";
    classList += hover ? ` ${hover}` : " hover-bg-near-white";
  } else if (type === "primary") {
    classList = "bg-dark-blue white relative";
    classList += border ? ` b--${border}` : " b--navy";
    classList += hover ? ` ${hover}` : " hover-bg-navy";
  } else if (type === "primary-reverse") {
    classList = "bg-transparent navy relative";
    classList += border ? ` b--${border}` : " b--navy";
    classList += hover ? ` ${hover}` : " hover-bg-navy hover-white";
  } else if (type === "alt-primary") {
    classList = "bg-navy white relative";
    classList += border ? ` b--${border}` : " b--navy";
    classList += hover ? ` ${hover}` : " hover-bg-dark-blue";
  } else if (type === "alt-primary-reverse") {
    classList = "bg-transparent dark-blue relative";
    classList += border ? ` b--${border}` : " b--dark-blue";
    classList += hover ? ` ${hover}` : " hover-bg-dark-blue hover-white";
  } else if (type === "success") {
    classList = "bg-green white relative";
    classList += border ? ` b--${border}` : " b--dark-green";
    classList += hover ? ` ${hover}` : " hover-bg-dark-green";
  } else if (type === "success-reverse") {
    classList = "bg-transparent dark-green relative";
    classList += border ? ` b--${border}` : " b--dark-green";
    classList += hover ? ` ${hover}` : " hover-bg-dark-green hover-white";
  } else if (type === "notice") {
    classList = "bg-gold white relative";
    classList += border ? ` b--${border}` : " b--orange";
    classList += hover ? ` ${hover}` : " hover-bg-orange";
  } else if (type === "notice-reverse") {
    classList = "bg-transparent orange relative";
    classList += border ? ` b--${border}` : " b--orange";
    classList += hover ? ` ${hover}` : " hover-bg-orange hover-white";
  } else if (type === "warning") {
    classList = "bg-red white relative";
    classList += border ? ` b--${border}` : " b--dark-red";
    classList += hover ? ` ${hover}` : " hover-bg-dark-red";
  } else if (type === "warning-reverse") {
    classList = "bg-transparent dark-red relative";
    classList += border ? ` b--${border}` : " b--dark-red";
    classList += hover ? ` ${hover}` : " hover-bg-dark-red hover-white";
  } else if (type === "alt-warning-reverse") {
    classList = "bg-transparent purple relative";
    classList += border ? ` b--${border}` : " b--purple";
    classList += hover ? ` ${hover}` : " hover-bg-purple hover-white";
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
  if (classes) classList += ` ${classes}`;
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
