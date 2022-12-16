/**
 * Entry point
 *
 * @module src/main.jsx
 * @exports {Element} Home
 * @author Darryl Cousins <cousinsd@proton.me>
 */
import { createElement, Fragment } from "@b9g/crank";
import { renderer } from "@b9g/crank/dom";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import bash from "highlight.js/lib/languages/bash";
import django from "highlight.js/lib/languages/django";
import nginx from "highlight.js/lib/languages/nginx";
import monkey from "highlight.js/lib/languages/monkey";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";

import "./style.scss";

import Page from "./components/app/page.jsx";
import { CopyrightIcon } from "./components/lib/icon.jsx";

document.addEventListener("DOMContentLoaded", async () => {
  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('django', django); // great job with .liquid file
  hljs.registerLanguage('bash', bash);
  hljs.registerLanguage('nginx', nginx);
  hljs.registerLanguage('monkey', monkey); // pretty good job with .env file
  hljs.registerLanguage('json', json);
  hljs.registerLanguage('html', xml);
  await renderer.render(
    <Fragment>
      <Page />

    </Fragment>
  , document.querySelector("#app"));
});
