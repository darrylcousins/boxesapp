/**
 * Load and render page from markdown source
 *
 * @module src/components/app/page
 * @exports {Element} Page
 * @author Darryl Cousins <cousinsd@proton.me>
 */
import { createElement, Fragment, Raw } from "@b9g/crank";
import { marked } from "marked";
import hljs from "highlight.js/lib/core";
//import hljs from "highlight.js";

import Navigation from "./navigation.jsx";
import Credits from "./credits.jsx";
import Alert from "./alert.jsx";
import BarLoader from "../lib/bar-loader.jsx";
import {
  LightModeIcon,
  DarkModeIcon,
  PreviewIcon,
} from "../lib/icon.jsx";
import {
  delay,
  animationOptions,
  animateFadeForAction,
} from "../helpers.jsx";

/**
 * Page component
 *
 * @returns {Element} DOM component
 * @example
 * { !loading && <Navigation /> }
 */
async function *Page() {

  let staticUrl = ""; // see vite.config.js for running dev on port

  let pathname;
  let params;
  /**
   * Loading indicator
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * Show alert box
   * @member {boolean} showAlert
   */
  let showAlert = true;
  /**
   * Mode indicator - light or dark, initialize with user preference?
   * @member {boolean} mode
   */
  //let mode = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  let mode = "dark";
  /**
   * Text indicator - parsed html or plain markdown text?
   * @member {boolean} parsed
   */
  let parsed = true;
  /**
   * Markdown content
   * @member {string} md
   */
  let md = "";
  /**
   * Markdown content presented as <pre><code> block
   * Initialize as empty, populate on showSource, then retained
   * @member {string} md_html
   */
  let md_html = "";
  /**
   * Parsed markdown content
   * @member {string} html
   */
  let html = "";
  /**
   * If we have another component to render, i.e. Reports
   * @member {object} component
   */
  let Component = null;

  addEventListener("beforeunload", () => { return false; });

  const imageEvents = () => {
    // add event listener for expanding image to all markdown content images if screen size large
    const content = document.querySelector("#page-content");
    const app = document.querySelector("#app");
    if (content) {
      if (window.innerWidth <= 480) { // mw7 40em
        content.querySelectorAll('img').forEach((el) => {
          el.removeEventListener("click", showImage);
          el.classList.remove("pointer");
        });
      } else {
        content.querySelectorAll('img').forEach((el) => {
          el.addEventListener("click", showImage);
          el.classList.add("pointer");
        });
      };
    };
  };

  window.addEventListener("resize", imageEvents);

  const showImage = (ev) => {
    document.querySelector("#overlayImage").setAttribute("src", ev.target.src);
    document.querySelector("#overlay").classList.remove("dn");
    document.querySelector("#overlay").classList.add("aspect-ratio--object", "db", "fixed");
    document.querySelector("#overlayContent").classList.remove("dn");
    document.querySelector("#overlayContent").classList.add("db");
  };

  const hideImage = (ev) => {
    document.querySelector("#overlayImage").setAttribute("src", "");
    document.querySelector("#overlay").classList.add("dn");
    document.querySelector("#overlay").classList.remove("aspect-ratio--object", "db");
    document.querySelector("#overlayContent").classList.remove("db");
    document.querySelector("#overlayContent").classList.add("dn");
  };

  document.documentElement.addEventListener("keyup", (ev) => {
    if (ev.key === "Escape") { // escape key maps to keycode `27`
      hideImage();
    }
  });

  /**
   * Promise fetching markdown content
   * @method {Promise} pullPage
   */
  const pullPage = async (pathname, index, params) => {
    let query = "";
    if (params) {
      for (const [key, value] of params.entries()) {
        query = (!query) ? "?": `${query}&`;
        query = `${query}${key}=${value}`;
      };
    };
    if (!index) history.pushState("", "", `${pathname}${query}`);
    //history.replaceState("", "", pathname)
    //if (pathname === `/reports${query ? query : ""}`) {
    if (pathname === `/reports`) {
      loading = false;
      showAlert = false;
      Component = await import("./reports.jsx").then(({ default: Reports }) => Reports);
      this.refresh();
      return;
    };
    Component = null;

    const headers = {
      "Accept": "text/markdown",
    };
    if (staticUrl.length < 2) headers["Cache-Control"] = "no-cache";
    try {
      fetch(`${staticUrl}${pathname}.md`, {headers})
        .then((res) => {
          if (!res.ok) {
            throw new Error(`${res.status} (${res.statusText})`);
          }
          return res.text();
        }).then((text) => {
          const div = document.createElement('div');
          div.innerHTML = marked.parse(text).trim();
          // highlight code syntax - see also registerLanguage in main.jsx
          div.querySelectorAll('pre code').forEach((el) => {
            hljs.highlightElement(el);
          });
          html = div.innerHTML;
          // place 4 spaces at start of each line for nested code block
          md = text.split("\n").map(line => `    ${line}`).join("\n");
          parsed = true; // always start with parsed html
        }).catch((err) => {
          html = `
          <h1>${err.message}</h1>
          `;
        }).finally(() => {
          // animate this
          if (pathname.includes("changelog") || pathname.includes("thoughts")) {
            showAlert = false;
          };
          loading = false;
          this.refresh();
          imageEvents();
        });
    } catch(e) {
      html = `
      <h1>${err.message}</h1>
      `;
    };
  };

  /**
   * Replace parsed source with markdown text
   * @method {Promise} showSource
   *
   * Need to add 4 spaces in order to nest a code block
   *
   */
  const showSource = async () => {
    if (parsed) {
      const fence = "```";
      const t = `
<h3>Showing Markdown Source For ${pathname}</h3>

${ `${ fence }markdown` }
${ `${ md }` }
${ `${ fence }` }
  `;
      md_html = marked.parse(t).trim();
    };
    parsed = !parsed;
    animateFadeForAction("page-content", () => this.refresh());
  };

  /**
   * Event listener - click loads new content and updates location
   * The ev.target is in Navigation
   */
  this.addEventListener("click", async (ev) => {
    if (typeof ev.target.dataset.page === "undefined") return false; // ignore other clicks

    ev.preventDefault();
    pathname = ev.target.dataset.page;

    // hide pushmenu
    document.querySelector("#menu-switch").checked = false;
    loading = true;
    this.refresh();
    const markdown = document.querySelector("#page-content");
    const options = { ...animationOptions };
    let animate = markdown.animate({ opacity: 0.05 }, options);

    animate.addEventListener("finish", async () => {
      await pullPage(pathname);
      options.duration = 5000;
      animate = markdown.animate({ opacity: 1 }, animationOptions);
    });

    ev.target.blur();
    
    // prevent href action on link
    return false;
  });

  pathname = window.location.pathname === "/" ? "/index" : window.location.pathname;
  params = new URLSearchParams(window.location.search)
  if (pathname === "/index.html" || pathname.includes("mail")) {
    pathname = "/index";
  };
  await pullPage(pathname, window.location.pathname === "/index.html", params);

  const toggleMode = (value) => {
    mode = value;
    document.documentElement.classList.toggle("dark-mode", mode === "dark");
    const logo = document.querySelector("#boxes-logo");
    if (logo) {
      logo.classList.add(mode);
      logo.classList.remove(mode === "dark" ? "light" : "dark");
    };
    this.refresh();
  };

  // initialized with dark-mode
  document.documentElement.classList.toggle(`${mode}-mode`, true);

  window.addEventListener("popstate", (event) => {
    pathname = document.location.pathname;
    pullPage(pathname);
  });

  for await (const _ of this) { // eslint-disable-line no-unused-vars
    yield (
      <Fragment>
        <div id="overlay" class="dn"></div>
        <div id="overlayContent" class="fixed dn h-100 w-100 tl">
          <img id="overlayImage" src="" alt=""
            onclick={ hideImage }
            class="ba bw1 br2 b--white b--solid pointer" />
        </div>
        { loading ? <BarLoader /> : <div class="bar-placeholder"></div> }
        <div class="cf w-100 db">
          <a class={ `link contain ${ mode } db fl mt2 mr4` }
            href="/"
            id="boxes-logo" style="width: 80px; height:80px;">
            &nbsp;
          </a>
          <div onclick={ (e) => showSource() }
            title={ `${parsed ? "Show" : "Hide" } markdown source` }
            class="pointer dib fr">
            <PreviewIcon />
          </div>
          <div onclick={ (e) => toggleMode(mode === "dark" ? "light" : "dark") }
            title={ `Switch to ${mode === "dark" ? "light" : "dark"} mode` }
            class="pointer dib fr mr2">
            { mode === "dark" ? <LightModeIcon /> : <DarkModeIcon /> }
          </div>
          <Navigation pathname={ pathname } mode={ mode } />
        </div>

        <div class="cf w-100 db">
          <div class="w-10 fl pa0 ma0"
            style="height: 25px;overflow: hidden">
            <a
              href="https://responsibleaidisclosure.com/"
              title="RAID: Responsible Ai Disclosure">
            <img src={ `${staticUrl}/no-ai.png` }
              class="outline-0"
              style="height: 25px;"
              height="25px"
              alt="RAID: Responsible Ai Disclosure" />
            </a>
          </div>
          <div class="w-90 fl pa0 ma0 tr"
            style="height: 25px;overflow: hidden">
            <a
              href="https://showyourstripes.info"
              title="ShowYourStripes">
            <img src={ `${staticUrl}/stripes-global-trimmed.png` }
              title="ShowYourStripes"
              class="outline-0"
              style="overflow: none"
              alt="ShowYourStripes" />
            </a>
          </div>
        </div>

        <div class="cf mb2"></div>
        { showAlert && (
          <Alert>
            This documentation was written mostly in spring 2022. In the winter
            of 2023 I spent several hundred hours of work making changes,
            adding features, and generally re-working the application. And then
            again Jan/Feb 2024 another 6 weeks of work. Therefore, this
            documentation is mostly out of date. Sorry.
          </Alert>
        )}
        <div id="page-wrapper" role="document">
          <div id="page-content" role="main" class={ `markdown-body ${mode}-mode` }>
            { Component ? (
              <Component mode={ mode } pathname={ pathname } params={ params } />
            ) : (
              <Fragment>
                { parsed ? (
                  <Raw value={ html } />
                ) : (
                  <Raw value={ md_html } />
                )}
              </Fragment>
            )}
          </div>
          <footer class="footer pb2 pt3 mt3 tl bt nowrap">
            <div id="timestamp" class="mb2">
              First published December 20 2022.<br />
              Last updated March 2024. { " " }
              &lt;<a href="/site-changelog"
                class={ `${mode} link dim` }
                data-page="/site-changelog"
                title="Changelog for this site">log</a>&gt;
            </div>
            Darryl Cousins
            <span class="ml1">&lt;
              <a class="link dim"
                href="mailto:cousinsd@cousinsd.net"
                title="cousinsd@cousinsd.net">
                cousinsd@cousinsd.net
              </a>&gt;
            </span>
          </footer>
          <Credits mode={ mode } />
        </div>
      </Fragment>
    );
  };
};


export default Page;
