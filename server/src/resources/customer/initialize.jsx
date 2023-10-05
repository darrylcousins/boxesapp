import { createElement } from "@b9g/crank";
import { renderer } from "@b9g/crank/dom";
import crossroads from "crossroads";

crossroads.addRoute("/", () => import("/src/resources/customer/components/home").then(({ default: Home }) => {
  return renderer.render(<Home />, document.getElementById("app"));
}));

document.addEventListener("DOMContentLoaded", () => {
  console.log("Initialized app");

  const paths = window.location.pathname.split("/").filter(el => el !== "");

  const currentPath = (paths.indexOf("customer-portal") === paths.length - 1) ? "/" : `/${paths[start + 1]}`;

  crossroads.parse(currentPath);

});

