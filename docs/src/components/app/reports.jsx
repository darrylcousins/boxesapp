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
import { getLogMessage, getMetaObject, formatMeta, possibleObjects, dateString } from "../lib/logs.jsx";
import {
  delay,
  animationOptions,
  animateFadeForAction,
  sleepUntil,
} from "../helpers.jsx";
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
async function *Reports({ mode, pathname, params }) {
  let staticUrl = ""; // see vite.config.js for running dev on port

  /**
   * Loading indicator
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * Couldn't load the files
   * @member {boolean} notfound
   */
  let notfound = false;
  /**
   * Collapsed mail
   * @member {boolean} mailCollapsed
   */
  let mailCollapsed = true;
  /**
   * Collapsed preamble
   * @member {boolean} preambleCollapsed
   */
  let preambleCollapsed = true;
  /**
   * Collapsed flags for webhooks
   * @member {boolean} webhookCollapsed
   */
  let webhookCollapsed = true;
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
   * The html mail file, stripped down to body tag innerHtml
   * @member {object} reportText
   */
  let mailHtml = null;
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
      }).catch((err) => {
        return null;
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
        return null;
      });
  };

  const handleClick = async (ev, obj) => {
    if (ev) {
      ev.preventDefault();
      ev.target.blur();
    };

    notfound = false;
    reportTitle = obj.title;
    reportDir = `/reports/${obj.folder}`;
    preambleCollapsed = true;
    webhookCollapsed = true;
    logNotesCollapsed = true;
    mailCollapsed = true;
    const reportPath = `${reportDir}/report.json`;
    const logPath = `${reportDir}/log.json`;
    report = await pullJson(reportPath);
    if (report === null) {
      reportHtml = null;
      logNotesHtml = null;
      mailHtml = null;
      notfound = true;
      loading = false;
      await this.refresh();
    };
    mailHtml = `/mail/${obj.folder}.html`;
    reportHtml = await pullMarkdown(`${reportDir}.md`);
    logNotesHtml = await pullMarkdown(`/reports/log-notes.md`);
    log = await pullJson(logPath);
    logsCollapsed = [];
    for (const idx in log) {
      logsCollapsed.push(parseInt(idx)); // make all initially collapsed
    };
    loading = false;
    await this.refresh();
    return false;
  };

  const fileSort = (a, b) => {
    const timeA = getDate(a).getTime();
    const timeB = getDate(b).getTime();
    if (timeA < timeB) return -1;
    if (timeA > timeB) return 1;
    return 0;
  };

  const capitalize = (word) => {
    return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
  };

  const toggleCollapse = (ev, key) => {
    ev.stopPropagation();
    if (key === "preamble") {
      preambleCollapsed = !preambleCollapsed;
    } else if (key === "mail") {
      mailCollapsed = !mailCollapsed;
    } else if (key === "webhook") {
      webhookCollapsed = !webhookCollapsed;
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

  const Content = ({ html, component, src, preamble }) => {
    let content;
    if (html) {
      content = (
        <div class={ `markdown-body pb4 ${mode}-mode` }>
          <Raw value={ html } />
        </div>
      );
    } else if (src) {
      content = (
        <iframe src={ src } width="100%" height="600">
        </iframe>
      );
    } else if (component) {
      content = component;
    };
    if (content) {
      if (preamble) {
        return (
          <Fragment>
            { preamble }
            { content }
          </Fragment>
        );
      } else {
        return content;
      };
    };
    return null;
  };

  const ContentWrapped = CollapseWrapper(Content);

  const Label = ({ message }) => {
    if (message.startsWith("API")) {
      return <code class="listing">API</code>;
    } else if (message.startsWith("Webhook")) {
      return <code class="listing">Webhook</code>;
    } else if (message.includes("email")) {
      return <code class="listing">Email</code>;
    };
    return <code class="listing">Boxes</code>;
  };

  const listFiles = (el, idx) => {
    const align = el.partner === "shopify" ? "tr" : "tl";
    return (
      <div class={ `dt w-100 pb2 ${idx > 0 ? "bt border-muted" : "" }` }>
        <div class="dt-row">
          <div class={ `dtc ${align}` }>
            <span class="b">{ el.partner }</span> { " " }
            <span class="b">{ el.key }/{ el.webhook }</span> { " " }
            { el.day } { el.time } { " " }
          </div>
        </div>
        <div class="dt-row">
          <div class={ `dtc ${align}` }>
            <span class="gray">{ capitalize(el.key) } id: { el.objId }</span>
          </div>
        </div>
        <div class="dt-row">
          <div class={ `dtc ${align}` }>
            <a href={ `${reportDir}/${el.filename}` }>{ el.filename }</a>
          </div>
        </div>
      </div>
    );
  };

  const Hook = ({ listing, preamble }) => {
    if (preamble) {
      return (
        <Fragment>
          { preamble }
          { listing.map((el, idx) => (
            listFiles(el, idx)
          ))}
        </Fragment>
      );
    };
    return (
      listing.map((el, idx) => (
        listFiles(el, idx)
      ))
    );
  };

  const HookWrapped = CollapseWrapper(Hook);

  const init = async () => {
    reports = await pullJson("/reports/reports.json");
    loading = false;
    this.refresh()
    if (params.get("report")) {
      const obj = [ ...reports.webhook, ...reports.user ].find(el => el.folder === params.get("report"));
      await delay(2000);
      console.log(obj);
      if (obj) handleClick(null, obj);
    };

  };

  await init();

  for await ({ mode, pathname, params } of this) {
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
          { Object.keys(reports).map((el, idx) => (
            <Fragment>
              <h4 class={ idx === 0 && "mt0" }>{ capitalize(el) } initiated activity:</h4>
            { reports[el].map(el => (
              <a 
                class={ 
                  `${mode}-mode listing ${reportTitle === el.title ? "selected" : ""
                  } link dib bg-animate dim ph3 pv2 outline-0 mb2 mt2 mh2 pointer ba br2` }
                href={ el.folder }
                onclick={ (ev) => handleClick(ev, el) }
                title={ el.title }>{ el.title }</a>
            ))}
            </Fragment>
          ))}
          <div id="log-content">
            { notfound && (
              <Fragment>
                <h2>404 Not found</h2>
                <h3>{ reportTitle } ({reportDir})</h3>
              </Fragment>
            )}
            { reportHtml && (
              <div class={ `bb ${mode}-mode mb2` }>
                <div title="Toggle preamble"
                  onclick={ (e) => toggleCollapse(e, "preamble") } 
                  class="dim bg-animate pointer w-100 dib mb0 pt1 flex">
                  <div class="w-50 fl">
                      <h2 class="mt0 bb-0">
                    { preambleCollapsed ? (<DoubleArrowDownIcon />) : (<DoubleArrowUpIcon />)}
                        { reportTitle }:
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
            { mailHtml && (
              <div class={ `bb ${mode}-mode mb2` }>
                <div title="Toggle mail"
                  onclick={ (e) => toggleCollapse(e, "mail") } 
                  class="dim bg-animate pointer w-100 dib mb0 pt1 flex">
                  <div class="w-50 fl">
                      <h2 class="mt0 bb-0">
                        { mailCollapsed ? (<DoubleArrowDownIcon />) : (<DoubleArrowUpIcon />)}
                        User email:
                      </h2>
                  </div>
                  <div class="w-50 tr fl pt3 b">
                    { mailCollapsed ? (<DoubleArrowDownIcon />) : (<DoubleArrowUpIcon />)}
                  </div>
                </div>
                <ContentWrapped
                  id="mail-content"
                  collapsed={ mailCollapsed }
                  src={ mailHtml }
                  preamble={ 
                    <p class="lh-copy">
                      This email is indicative only and may not represent the
                      email that relates directly to this log report.
                    </p>
                  }
                />
              </div>
            )}
            { report && (
              <div class={ `bb ${mode}-mode mb2` }>
                <div title="Toggle webhooks"
                  onclick={ (e) => toggleCollapse(e, "webhook") } 
                  class="dim bg-animate pointer w-100 dib mb0 pt1 flex">
                  <div class="w-50 fl">
                    <h2 class="mt0 bb-0">
                      { webhookCollapsed ? (<DoubleArrowDownIcon />) : (<DoubleArrowUpIcon />)}
                      Webhooks received:
                    </h2>
                  </div>
                  <div class="w-50 tr fl pt3 b">
                    { webhookCollapsed ? (<DoubleArrowDownIcon />) : (<DoubleArrowUpIcon />)}
                  </div>
                </div>
                <div class={ `cf w-100 ${webhookCollapsed ? "pb0" : "pb2" }` }>
                  <HookWrapped
                    id="listing-content"
                    collapsed={ webhookCollapsed }
                    listing={ report.files }
                    preamble={ 
                      <p class="lh-copy">
                        The webhooks received during the {report.timedelta} seconds that
                        elapsed between the first relevant log and the final log.
                        The webhook body data has been saved directly to file and are listed here.
                      </p>
                    }
                  />
                </div>
              </div>
            )}
            { log && (
              <div class="w-100">
                <h2 class="mt0 bb-0">Logs <span class="smaller">({ log.length }): {" "}
                  <a class="smaller ml5 normal" href={ `${reportDir}/log.json` }>{ `${reportDir}/log.json` }</a></span>
                  <span class="smaller ml5">Latest first</span>
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
                  onclick={ (e) => toggleCollapse(e, "notes") } 
                  class="dim bg-animate pointer w-100 dib mb0 pt1 flex">
                  <div class="w-50 fl">
                      <h4 class="mt0 mb0 bb-0">
                        { logNotesCollapsed ? (<DoubleArrowDownIcon />) : (<DoubleArrowUpIcon />)}
                        Read me:
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
                    class={ `${ mode }-mode link dib bg-transparent dim ph3 pv2 outline-0 mv1 mh2 pointer ba br2` }
                    onclick={ (ev) => toggleAllLogs("open") }
                    title="Open all logs">Open all</button>
                  <button
                    class={ `${ mode }-mode link dib bg-transparent dim ph3 pv2 outline-0 mv1 mh2 pointer ba br2` }
                    onclick={ (ev) => toggleAllLogs("close") }
                    title="Collapse all logs">Collapse all</button>
                </div>
                { log.map((el, idx) => (
                  <Fragment>
                    <div class={ `w-100 ${ idx > 0 ? "bt" : "" } pt2 b--gray` }>
                      <div title="Toggle collapse"
                          onclick={ (e) => toggleCollapse(e, idx) } 
                          class="dim bg-animate pointer dib pt1 dt--fixed">
                        <div class="tl w-30 fl"
                          onclick={ (e) => toggleCollapse(e, idx) } 
                        >
                          { logsCollapsed.indexOf(idx) > -1 ? (<DoubleArrowDownIcon />) : (<DoubleArrowUpIcon />)}
                          { dateString(el) } { " " }
                        </div>
                        <div class="b tr pa0 pr2 ma0 mt1 w-10 fl"
                          onclick={ (e) => toggleCollapse(e, idx) } 
                        >
                          <code class="listing">{ getMetaObject(el) }</code>
                        </div>
                        <div class="tl pa0 pr1 ma0 mt1 w-10 fl"
                          onclick={ (e) => toggleCollapse(e, idx) } 
                        >
                          <Label message={ el.message } />
                        </div>
                        <div class="b tl pa0 ma0 mt1 truncate w-50 fl"
                          onclick={ (e) => toggleCollapse(e, idx) } 
                        >
                          { getLogMessage(el) }
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
          </div>
        </Fragment>
      );
    };
  };
};

export default Reports;
