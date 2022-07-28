import { createElement, Fragment } from "@b9g/crank";
import { renderer } from "@b9g/crank/dom";

renderer.render(
  <Fragment>
    <div id="hello">Hello world</div>
  </Fragment>
, document.querySelector("#app"));

