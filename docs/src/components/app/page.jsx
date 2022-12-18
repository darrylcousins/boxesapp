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
function *Page() {
  /**
   * Loading indicator
   * @member {boolean} loading
   */
  let loading = true;

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

  addEventListener("beforeunload", () => { return false; });

  const imageEvents = () => {
    // add event listener for expanding image to all markdown content images if screen size large
    const content = document.querySelector("#page-content");
    const app = document.querySelector("#app");
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
  const pullPage = (pathname) => {
    fetch(`.${pathname}.md`, {
      headers: {
        "Accept": "text/markdown",
        "Cache-Control": "no-cache",
      }})
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
      }).finally(async () => {
        // animate this
        loading = false;
        await this.refresh();
        imageEvents();
      });
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
    if (typeof ev.target.dataset.page === "undefined") return; // ignore other clicks
    ev.preventDefault();

    pathname = ev.target.dataset.page;
    history.pushState("", "", pathname)

    // hide pushmenu
    document.querySelector("#menu-switch").checked = false;
    loading = true;
    this.refresh();
    const markdown = document.querySelector("#page-content");
    const options = { ...animationOptions };
    let animate = markdown.animate({ opacity: 0.05 }, options);

    animate.addEventListener("finish", async () => {
      //await delay(1000); // pretend network load
      pullPage(pathname);
      options.duration = 5000;
      animate = markdown.animate({ opacity: 1 }, animationOptions);
    });

    ev.target.blur();
    
    // prevent href action on link
    return false;
  });

  let pathname = window.location.pathname === "/" ? "/index" : window.location.pathname;

  pullPage(pathname);

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

  while(true) {
    yield (
      <Fragment>
        <div id="overlay" class="dn"></div>
        <div id="overlayContent" class="fixed dn h-100 w-100 tl">
          <img id="overlayImage" src="" alt=""
            onclick={ hideImage }
            class="ba bw1 br2 b--white b--solid pointer" />
        </div>
        { loading ? <BarLoader /> : <div class="bar-placeholder"></div> }
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
        <div class="cf"></div>
        <div id="page-wrapper" role="document">
          <Alert>
            This documentation is still under construction, incomplete, and
            already a little out of date. The
            application itself is running successfully on a
            <a href="https://www.streamsideorganics.co.nz/collections/veggie-boxes-1"
              class="link mh1 b black-60 dim"
              title="Streamside Organics">production site</a>
            but a list of improvements and features are waiting in the wings
            until such a time when the
                <a href="https://cousinsd.net"
              class="link mh1 b black-60 dim"
              title="Darryl Cousins">developer</a>
                has time to resume work on it.
          </Alert>
          <div id="page-content" role="main" class={ `markdown-body ${mode}-mode` }>
            { parsed ? (
              <Raw value={ html } />
            ) : (
              <Raw value={ md_html } />
            )}
          </div>
          <footer class="footer pb2 pt3 mt3 tl bt nowrap">
            <div id="timestamp" class="mb2">
              Published December 20 2022.
            </div>
            Darryl Cousins
            <span class="ml1">&lt;
              <a class="link dim"
                href="mailto:cousinsd@proton.me"
                title="cousinsd@proton.me">
                cousinsd@proton.me
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
