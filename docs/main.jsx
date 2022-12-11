import "tachyons/src/tachyons.css";
import "./style.css";
import "./github-markdown.css";
import "highlight.js/styles/stackoverflow-light.css";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Initialized app");

  const paths = window.location.pathname.split("/").filter(el => el !== "");

  console.log(paths);

  if (paths.length === 0) paths.push("index");

  import(`./md-sources/${paths.join("/")}.md`).then(({ default: html }) => {
    document.querySelector("#navigation").classList.add("on");
    document.querySelector("#app").innerHTML = html;
  });
});
