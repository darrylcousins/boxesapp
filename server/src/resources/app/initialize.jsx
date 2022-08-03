import ReactDOM from "react-dom";
import { createElement } from "react";
import crossroads from "crossroads";

crossroads.addRoute("/", () => import("/src/resources/app/components/App").then(({ default: App }) => {
  return ReactDOM.render(<App />, document.getElementById("app"));
}));

document.addEventListener("DOMContentLoaded", () => {
  console.log("Initialized app");
  crossroads.parse("/");
});
