import { createElement } from "@b9g/crank";
import { renderer } from "@b9g/crank/dom";
import crossroads from "crossroads";

const routes = "/src/resources/admin/components/routes";

crossroads.addRoute("/", () => import(`/src/resources/admin/components/routes/home`).then(({ default: Home }) => {
  return renderer.render(<Home />, document.getElementById("app"));
}));
crossroads.addRoute("/boxes", () => import(`/src/resources/admin/components/routes/boxes`).then(({ default: Boxes }) => {
  return renderer.render(<Boxes />, document.getElementById("app"));
}));
crossroads.addRoute("/boxes/box-rules", () => import(`/src/resources/admin/components/routes/box-rules`).then(({ default: BoxRules }) => {
  return renderer.render(<BoxRules />, document.getElementById("app"));
}));
crossroads.addRoute("/boxes/core-box", () => import(`/src/resources/admin/components/routes/core-box`).then(({ default: CoreBox }) => {
  return renderer.render(<CoreBox />, document.getElementById("app"));
}));
crossroads.addRoute("/logs", () => import(`/src/resources/admin/components/routes/logs`).then(({ default: Logs }) => {
  return renderer.render(<Logs />, document.getElementById("app"));
}));
crossroads.addRoute("/settings", () => import(`/src/resources/admin/components/routes/settings`).then(({ default: Settings }) => {
  return renderer.render(<Settings />, document.getElementById("app"));
}));
crossroads.addRoute("/orders", () => import(`/src/resources/admin/components/routes/orders`).then(({ default: Orders }) => {
  return renderer.render(<Orders />, document.getElementById("app"));
}));
crossroads.addRoute("/recharge", () => import(`/src/resources/admin/components/routes/recharge`).then(({ default: Recharge }) => {
  return renderer.render(<Recharge />, document.getElementById("app"));
}));
/*
crossroads.addRoute("/trial", () => import(`/src/resources/admin/components/routes/trial2`).then(({ default: Box }) => {
  return renderer.render(<Box />, document.getElementById("app"));
}));
*/

document.addEventListener("DOMContentLoaded", () => {
  console.log("Initialized app");

  const paths = window.location.pathname.split("/").filter(el => el !== "");
  const start = paths.indexOf("admin-portal");

  const currentPath = (start === paths.length - 1) ? "/" : `/${paths.slice(start + 1).join("/")}`;

  crossroads.parse(currentPath);

});
