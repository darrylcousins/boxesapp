/** title="Toggle collapse"
 * Load and render credits
 *
 * @module src/components/app/credits
 * @exports {Element} Credits
 * @author Darryl Cousins <cousinsd@proton.me>
 */
import { createElement, Fragment, Raw } from "@b9g/crank";
import { marked } from "marked";
import hljs from "highlight.js/lib/core";

import BarLoader from "../lib/bar-loader.jsx";
import { getMetaObject, formatMeta, possibleObjects, dateString } from "../lib/logs.jsx";
import { delay } from "../helpers.jsx";
import CollapseWrapper from "../lib/collapse-animator.jsx";
import { DoubleArrowDownIcon } from "../lib/icon.jsx";
import { DoubleArrowUpIcon } from "../lib/icon.jsx";


/**
 * Credits component
 *
 * @returns {Element} DOM component
 * @example
 * { <Credits /> }
 */
async function *Reports({ mode }) {
  let staticUrl = ""; // see vite.config.js for running dev on port

  /**
   * Loading indicator
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * Collapsed preamble
   * @member {boolean} preambleCollapsed
   */
  let preambleCollapsed = true;
  /**
   * Collapsed flags for webhooks
   * @member {boolean} webhookCollapsed
   */
  const webhookCollapsed = { recharge: true, shopify: true };
  /**
   * Collapsed logNotesCollapsed
   * @member {boolean} logNotesCollapsed
   */
  let logNotesCollapsed = true;
  /**
   * Collapsed flags for logs - list of idx values
   * @member {boolean} logsCollapsed
   */
  let logsCollapsed = [];
  /**
   * The listing of reports as fetched as json
   * @member {object} reports
   */
  let reports = null;
  /**
   * The parsed markdown text for the report
   * @member {object} reportText
   */
  let reportHtml = null;
  /**
   * The parsed markdown text for log notes
   * @member {object} logNotesHtml
   */
  let logNotesHtml = null;
  /**
   * The current report title as described in reports
   * @member {object} reportTitle
   */
  let reportTitle = null;
  /**
   * The current report directory e.g. /reports/upcoming
   * @member {object} reportDir
   */
  let reportDir = null;
  /**
   * The current report as a json object
   * @member {object} report
   */
  let report = null;
  /**
   * The current log as a json object
   * @member {object} log
   */
  let log = null;
  /**
   * Include the properties on meta data?
   *
   * @member includeProperties
   * @type {boolean}
   */
  let includeProperties = false;
  /**
   * Include the change messages on meta data?
   *
   * @member includeMessages
   * @type {boolean}
   */
  let includeMessages = true;
  /**
   * Include the rc_subscriptions on meta data?
   *
   * @member includeRcs
   * @type {boolean}
   */
  let includeRcIDs = false;

  /*
   * Show box properties
   * Include all box lists (includes, swaps etc) in the displayed log data?
   * @function showBoxProperties
   */
  const showBoxProperties = (value) => {
    includeProperties = value;
    this.refresh();
  };

  /*
   * Show change messages
   * @function showMessages
   */
  const showMessages = (value) => {
    includeMessages = value;
    this.refresh();
  };

  /*
   * Show rc subscription ids
   * @function closeMenu
   */
  const showRcIDs = (value) => {
    includeRcIDs = value;
    this.refresh();
  };

  /**
   * Fetching json files
   * @member {Promise} pull
   */
  const pullJson = async (path) => {
    const headers = {
      "Accept": "application/json",
    };
    if (staticUrl.length < 2) headers["Cache-Control"] = "no-cache";
    return await fetch(`${staticUrl}${path}`, {headers})
    .then((res) => {
      if (!res.ok) {
        throw new Error(`${res.status} (${res.statusText})`);
      }
      return res.json();
    });
  };

  /**
   * Fetching markdown files
   * @member {Promise} pull
   */
  const pullMarkdown = async (path) => {
    const headers = {
      "Accept": "text/markdown",
    };
    if (staticUrl.length < 2) headers["Cache-Control"] = "no-cache";
    return await fetch(`${staticUrl}${path}`, {headers})
      .then((res) => {
        if (!res.ok) {
          throw new Error(`${res.status} (${res.statusText})`);
        };
        return res.text();
      }).then((text) => {
        const div = document.createElement('div');
        div.innerHTML = marked.parse(text).trim();
        // highlight code syntax - see also registerLanguage in main.jsx
        div.querySelectorAll('pre code').forEach((el) => {
          hljs.highlightElement(el);
        });
        return div.innerHTML;
      }).catch((err) => {
        return `
        <h4>${err.message}</h4>
        `;
      });
  };

  const handleClick = async (ev, obj) => {
    ev.preventDefault();

    // first get the report.json file
    loading = true;
    this.refresh();
    reportTitle = obj.title;
    reportDir = `/reports/${obj.folder}`;
    const reportPath = `${reportDir}/report.json`;
    const logPath = `${reportDir}/log.json`;
    report = await pullJson(reportPath);
    reportHtml = await pullMarkdown(`${reportDir}.md`);
    logNotesHtml = await pullMarkdown(`/reports/log-notes.md`);
    log = await pullJson(logPath);
    for (const idx in log) {
      logsCollapsed.push(parseInt(idx)); // make all initially collapsed
    };
    loading = false;
    this.refresh()
    // second get the log.json file
    // all files are under /reports/key e.g. upcoming or similar
    return false;
  };

  const listFiles = (el) => {
    return (
      <li class="mb3">
        <div class="dt w-100">
          <div class="dt-row">
            <div class="dtc">
              { el.day } { el.time } { " " }
              <span class="b">{ el.key }/{ el.webhook }</span>
            </div>
          </div>
          <div class="dt-row">
            <div class="dtc">
              <a href={ `${reportDir}/${el.filename}` }>{ el.filename }</a>
            </div>
          </div>
        </div>
      </li>
    );
  };

  const capitalize = (word) => {
    return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
  };

  const toggleCollapse = (key) => {
    if (key === "preamble") {
      preambleCollapsed = !preambleCollapsed;
    } else if (["recharge", "shopify"].includes(key)) {
      webhookCollapsed[key] = !webhookCollapsed[key];
    } else if (key === "notes") {
      logNotesCollapsed = !logNotesCollapsed;
    } else if (!isNaN(parseInt(key))) {
      if (logsCollapsed.indexOf(key) > -1) {
        logsCollapsed.splice(logsCollapsed.indexOf(key), 1);
      } else {
        logsCollapsed.push(key);
      };
    };
    this.refresh();
  };

  const toggleAllLogs = (key) => {
    if (key === "open") {
      logsCollapsed = [];
    } else {
      for (const idx in log) {
        logsCollapsed.push(parseInt(idx)); // make all initially collapsed
      };
    };
    this.refresh();
  };

  const Content = ({ html, component }) => {
    if (html) {
    return (
      <div class={ `markdown-body pb4 ${mode}-mode` }>
        <Raw value={ html } />
      </div>
    );
    } else if (component) {
      return component;
    };
  };

  const ContentWrapped = CollapseWrapper(Content);

  const Hook = ({ listing }) => {
    return (
      <ul class="list">
        { listing.map(el => (
          listFiles(el)
        ))}
      </ul>
    );
  };

  const HookWrapped = CollapseWrapper(Hook);

  const init = async () => {
    reports = await pullJson("/reports/reports.json")
      .then(json => json);
    loading = false;
    this.refresh()
  };

  await init();

  for await ({ mode } of this) {
    if (!reports) {
      yield (
        <Fragment>
          <h1>Reports</h1>
          { loading ? <BarLoader /> : <div class="bar-placeholder"></div> }
        </Fragment>
      );
    } else {
      yield (
        <Fragment>
          <h1>Reports</h1>
          { loading ? <BarLoader /> : <div class="bar-placeholder"></div> }
          { reports.map(el => (
            <a 
              class={ `${ mode } link dib bg-animate dim ph3 pv2 outline-0 mv1 mh2 pointer ba br2` }
              href={ el.folder }
              onclick={ (ev) => handleClick(ev, el) }
              title={ el.title }>{ el.title }</a>
          ))}
          { reportHtml && (
            <div class={ `bb ${mode} mb2` }>
              <div title="Toggle preamble"
                onclick={ (e) => toggleCollapse("preamble") } 
                class="dim bg-animate pointer w-100 dib mb3 pt1 flex">
                <div class="w-50 fl">
                    <h2 class="mt0 bb-0">
                  { preambleCollapsed ? (<DoubleArrowDownIcon />) : (<DoubleArrowUpIcon />)}
                      Preamble:
                    </h2>
                </div>
                <div class="w-50 tr fl pt3 b">
                  { preambleCollapsed ? (<DoubleArrowDownIcon />) : (<DoubleArrowUpIcon />)}
                </div>
              </div>
              <ContentWrapped
                id="preamble-content"
                collapsed={ preambleCollapsed }
                html={ reportHtml }
              />
            </div>
          )}
          { report && (
            <div class={ `bb ${mode} mb2` }>
              <h2 class="mt0 bb-0">Webhooks received:</h2>
              <p class="lh-copy">
                The webhooks received during the {report.timedelta} seconds that
                elapsed between the first relevant log and the final log.
                The webhook body data has been saved directly to file and are listed here.
              </p>
              { ["recharge", "shopify"].map(hook => (
                Object.hasOwn(report.files, hook) && report.files[hook].length > 0 && (
                  <div class="dib w-100">
                    <div title="Toggle collapse"
                      onclick={ (e) => toggleCollapse(hook) } 
                      class="dim bg-animate pointer w-100 dib mb3 pt1 flex">
                      <div class="w-50 fl">
                        <h3 class="mt0">
                          { webhookCollapsed[hook] ? (<DoubleArrowDownIcon />) : (<DoubleArrowUpIcon />)}
                          { capitalize(hook) } <span class="smaller">({ report.files[hook].length })</span>:
                        </h3>
                      </div>
                      <div class="w-50 tr fl pt3 b">
                        { webhookCollapsed[hook] ? (<DoubleArrowDownIcon />) : (<DoubleArrowUpIcon />)}
                      </div>
                    </div>
                    <HookWrapped
                      id={ `${hook}-content` }
                      collapsed={ webhookCollapsed[hook] }
                      listing={ report.files[hook] }
                    />
                  </div>
                )
              ))}
            </div>
          )}
          { log && (
            <div class="w-100">
              <h2 class="mt0 bb-0">Logs <span class="smaller">({ log.length }): {" "}
                <a class="smaller ml5 normal" href={ `${reportDir}/log.json` }>{ `log.json` }</a></span>
              </h2>
              <div class="w-100">
                <div class="w-30 v-top mb2 tr fl">
                  <div class="dt--fixed">
                    <div class="dt-row">
                      <label for="includeProperties" class="w5 pr3 dtc">properties?</label>
                      <div class="dtc">
                        <input
                          checked={includeProperties}
                          type="checkbox"
                          name="includeProperties"
                          id="includeProperties"
                          onchange={ (ev) => showBoxProperties(ev.target.checked) }
                        />
                      </div>
                    </div>
                    <div class="dt-row">
                      <label for="includeRcIDs" class="w5 pr3 dtc">rc_subscription_ids?</label>
                      <div class="dtc">
                        <input
                          checked={includeRcIDs}
                          type="checkbox"
                          name="includeRcIDs"
                          id="includeRcIDs"
                          onchange={ (ev) => showRcIDs(ev.target.checked) }
                        />
                      </div>
                    </div>
                    <div class="dt-row">
                      <label for="includeMessages" class="w5 pr3 dtc">messages?</label>
                      <div class="dtc">
                        <input
                          checked={includeMessages}
                          type="checkbox"
                          name="includeMessages"
                          id="includeMessages"
                          onchange={ (ev) => showMessages(ev.target.checked) }
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div class="w-70 fl">
                  <div class="db mt0">
                    Some fields are hidden for brevity, check the boxes to include the additional fields:
                  </div>
                </div>
              </div>
              <div class="cf" />
              <div title="Toggle notes"
                onclick={ (e) => toggleCollapse("notes") } 
                class="dim bg-animate pointer w-100 dib mb0 pt1 flex">
                <div class="w-50 fl">
                    <h4 class="mt0 mb0 bb-0">
                      { logNotesCollapsed ? (<DoubleArrowDownIcon />) : (<DoubleArrowUpIcon />)}
                      Notes:
                    </h4>
                </div>
                <div class="w-50 tr fl b">
                  { logNotesCollapsed ? (<DoubleArrowDownIcon />) : (<DoubleArrowUpIcon />)}
                </div>
              </div>
              <ContentWrapped
                id="notes-content"
                collapsed={ logNotesCollapsed }
                html={ logNotesHtml }
              />
              <div class="tr w-60">
                <button
                  class={ `${ mode } link dib bg-transparent dim ph3 pv2 outline-0 mv1 mh2 pointer ba br2` }
                  onclick={ (ev) => toggleAllLogs("open") }
                  title="Open all logs">Open all</button>
                <button
                  class={ `${ mode } link dib bg-transparent dim ph3 pv2 outline-0 mv1 mh2 pointer ba br2` }
                  onclick={ (ev) => toggleAllLogs("close") }
                  title="Collapse all logs">Collapse all</button>
              </div>
              { log.map((el, idx) => (
                <Fragment>
                  <div class={ `w-100 ${ idx > 0 ? "bt" : "" } pt2 b--gray` }>
                    <div title="Toggle collapse"
                        onclick={ (e) => toggleCollapse(idx) } 
                        class="dim bg-animate pointer w-100 dib pt1 flex">
                      <div class="w-80">
                        { logsCollapsed.indexOf(idx) > -1 ? (<DoubleArrowDownIcon />) : (<DoubleArrowUpIcon />)}
                        <span class="mr5 mt1">{ dateString(el) } { " " }</span>
                        <span class="b ml3 mt1">{ el.message }</span>
                      </div>
                      <div class="dib tr pa0 ma0 w-20 mt1">
                        { getMetaObject(el) }
                      </div>
                    </div>
                  </div>
                  <div class="w-100 pb3">
                    <ContentWrapped
                      id={ `log-${idx}` }
                      collapsed={ logsCollapsed.indexOf(idx) > -1 }
                      component={ formatMeta(el, "all", includeProperties, includeRcIDs, includeMessages) }
                    />
                  </div>
                </Fragment>
              ))}
            </div>
          )}
        </Fragment>
      );
    };
  };
};

export default Reports;
