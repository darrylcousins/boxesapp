/**
 * Render an alert box
 *
 * @module src/components/app/alert
 * @exports {Element} Alert
 * @author Darryl Cousins <cousinsd@proton.me>
 */
import { createElement, Fragment } from "@b9g/crank";

/**
 * Alert component
 *
 * @returns {Element} DOM component
 * @example
 * { <Alert><p>Some text</p></Alert }
 */
function Alert({ children }) {

  return (
<div class="alert items-center flex ba b--black br2 ph3 pv2 mb2 black-80" 
  style="background-color: sandybrown" role="alert">
<div class="f1 w-10 tc"><span class="v-mid">&#9888;</span></div>
<p class="lh-copy w-90 pt2">
        { children }
</p>
</div>
  );
};

export default Alert;


