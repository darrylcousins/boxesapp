/**
 * Load and render navigation
 *
 * @module src/components/app/navigation
 * @exports {Element} Navigation
 * @author Darryl Cousins <cousinsd@proton.me>
 */
import { createElement, Fragment } from "@b9g/crank";

import { MenuIcon } from "../lib/icon.jsx";

/**
 * Navigation component
 *
 * @returns {Element} DOM component
 * @example
 * { !loading && <Navigation /> }
 */
function *Navigation({ pathname, mode }) {
  /**
   * Loading indicator
   * @member {boolean} loading
   */
  let loading = true;

  let staticUrl = ""; // see vite.config.js for running dev on port

  /**
   * Navigation json definition
   * @member {string} json
   */
  let navigation = [];

  /**
   * Promise fetching navigation json definition
   * @member {Promise} pull
   */
  const pull = fetch(`${staticUrl}/navigation.json`, {headers: {'Accept': 'application/json'}})
    .then((res) => {
      if (!res.ok) {
        throw new Error(`${res.status} (${res.statusText})`);
      }
      return res.json();
    });

  pull.then((json) => {
    navigation = json.navigation;
  }).catch((err) => {
    console.log(err.message);
  }).finally(() => {
    // animate this
    loading = false;
    this.refresh();
  });

  for ({ pathname, mode } of this) {
    yield (
      <Fragment>
        { !loading && navigation.length > 0 && (
          <Fragment>
            <input id="menu-switch" type="checkbox" />
            <nav id="pushmenu" class={ `${ mode }-mode` } role="navigation">
              <ul class="list">
                { navigation.map(el => (
                  el.subnav ? (
                    <li class="mb3">
                      <a class={
                        `${ mode } ${ el.subnav.map(e => e.link).includes(pathname) 
                            ? "selected " : "" }link dim` }
                      >{ el.title }</a>
                      <div class="">
                        { el.subnav.map(sub => (
                          <a class={
                            `${ mode } ${ pathname === sub.link
                                ? "selected " : "" }link dim db pl3 mt2` }
                            href={ sub.link }
                            data-page={ sub.link } title={ sub.description }>
                            { sub.title }
                          </a>
                        ))}
                      </div>
                    </li>
                  ) : (
                    <li class="mb3">
                      <a class={ `${ mode } ${ pathname === el.link ? "selected " : "" }link dim` }
                        href={ el.link }
                        data-page={ el.link }
                        title={ el.description }>{ el.title }</a>
                    </li>
                  )
                ))}
              </ul>
            </nav>
            <div id="navigation" class={ `${ mode }-mode` }>
              <label for="menu-switch" id="menu-toggle"><MenuIcon /></label>
              <nav id="menu" role="navigation">
                <ul>
                  { navigation.map((el, idx, arr) => (
                    el.subnav ? (
                      <li class="dropdown">
                        <a class={
                          `${ mode } ${ el.subnav.map(e => e.link).includes(pathname) 
                              ? "selected " : "" }dropbtn link dim dib tc ph2 pv2 pointer` }
                        >{ el.title }</a>
                        <div class="dropdown-content">
                          { el.subnav.map(sub => (
                            <a class={
                              `${ mode } ${ pathname === sub.link 
                                  ? "selected " : "" }link dim` }
                              href={ sub.link }
                              data-page={ sub.link } title={ sub.description }>
                              { sub.title }
                            </a>
                          ))}
                        </div>
                      </li>
                    ) : (
                      <li>
                        <a class={ `${ mode } ${ pathname === el.link ? "selected " : "" }link dim dib tc ph2 pv2` }
                          href={ el.link }
                          data-page={ el.link }
                          title={ el.description }>{ el.title }</a>
                      </li>
                    )
                  ))}
                </ul>
              </nav>
            </div>
          </Fragment>
        )}
      </Fragment>
    );
  };
};


export default Navigation;

