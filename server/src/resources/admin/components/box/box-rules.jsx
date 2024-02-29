/**
 * Creates element to render a modal display in {@link
 * module:app/components/order-detail~OrderDetail|OrderDetail}
 *
 * @module app/components/box-rules
 * @exports BoxRulesModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal} from "@b9g/crank";
import { CloseIcon } from "../lib/icon";
import { Fetch } from "../lib/fetch";
import { animateFadeForAction, hasOwnProp } from "../helpers";
import Form from "../form";
import Button from "../lib/button";
import BarLoader from "../lib/bar-loader";
import IconButton from "../lib/icon-button";
import CollapseWrapper from "../lib/collapse-animator";
import { toastEvent } from "../lib/events";
import Toaster from "../lib/toaster";
import RulesForm from "./box-rules-form";
import BoxRule from "./box-rule";

/**
 * Display box rules
 *
 * @generator
 * @yields {Element} DOM element displaying box rules forms
 * @param {object} props Property object
 * @param {object} props.order The order to be displayed
 */
function* BoxRules({ }) {

  /**
   * Hold loading state.
   *
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * Hold collapsed state of add form
   *
   * @member {boolean} collapsed
   */
  let collapsed = true;
  /**
   * Box rules as collected from api
   *
   * @member {array} fetchRules
   */
  let fetchRules = [];

  /*
   * Control the collapse of the form
   * @function toggleCollapse
   */
  const toggleCollapse = () => {
    collapsed = !collapsed;
    if (document.getElementById("add-rule-button")) {
      animateFadeForAction("add-rule-button", async () => await this.refresh());
    } else if (document.getElementById("box-rules-add-form")) {
      animateFadeForAction("box-rules-add-form", async () => await this.refresh());
    } else {
      this.refresh();
    };
  };

  /**
   * Fetch rules data on mounting of component
   *
   * @function getRules
   */
  const getRules = () => {
    let uri = "/api/current-box-rules";
    Fetch(uri)
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          console.warn(error);
          loading = false;
          this.refresh();
        } else {
          loading = false;
          fetchRules = json;
          if (document.getElementById("box-rules-table")) {
            animateFadeForAction("box-rules-table", async () => await this.refresh());
          } else {
            this.refresh();
          };
        }
      })
      .catch((err) => {
        loading = false;
        this.refresh();
      });
  };

  getRules();

  /**
   * Event handler when rule added with RulesAddForm or edited with RulesForm
   *
   * @function reloadRules
   * @param {object} ev The event
   * @listens box.rules.reload
   */
  const reloadRules = (ev) => {
    getRules();
  };

  this.addEventListener("listing.reload", reloadRules); // from form remove

  /**
   * For messaging user
   */
  this.addEventListener("toastEvent", Toaster);

  /*
   * Wrap add rules form
   */
  const RulesAddForm = CollapseWrapper(RulesForm);

  while (true) {
    yield (
      <Fragment>
        <div class="w-100 pb2 mw9 center">
          {loading && <BarLoader />}
          <h3 class="pt0 lh-title ma0 fg-streamside-maroon" id="boxes-title">
            Box Rules
          </h3>
          {collapsed && (
            <div id="add-rule-button" class="pb2 tr">
              <Button type="primary" title="Add Box Rule" onclick={toggleCollapse}>
                <span>Add Box Rule</span>
              </Button>
            </div>
          )}
          <div class="tr">
            <RulesAddForm
              collapsed={collapsed}
              id="box-rules-add-form"
              toggleCollapse={toggleCollapse}
              rule={false}
              disabled={false}
            />
          </div>
          <div id="box-rules-table">
            {fetchRules.length === 0 ? (
              <div>No current box rules</div>
            ) : (
              fetchRules.map(rule => (
                <BoxRule rule={rule} />
              ))
            )}
          </div>
        </div>
      </Fragment>
    );
  };
}

export default BoxRules;
