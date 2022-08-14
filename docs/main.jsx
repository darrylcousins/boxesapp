import { createElement, Fragment } from "@b9g/crank";
import { renderer } from "@b9g/crank/dom";

import "./style.css";

renderer.render(
  <Fragment>
    <div id="hello">Boxes App Documentation</div>
    <div>
      <a href="mailto:darryljcousins@gmail.com">darryljcousins@gmail.com</a>
    </div>
  </Fragment>
, document.querySelector("#app"));
