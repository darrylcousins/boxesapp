/**
 * Creates element to render add box rule form - used by box-settings and
 * wrapped in CollapseWrapper
 *
 * @module app/components/box-rules-add
 * @exports BoxRulesModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal} from "@b9g/crank";
import { CloseIcon, EditIcon } from "../lib/icon";
import { Fetch, PostFetch } from "../lib/fetch";
import { animateFadeForAction, animateFade, parseStringTemplate } from "../helpers";
import Form from "../form";
import Button from "../lib/button";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";
import IconButton from "../lib/icon-button";
import CollapseWrapper from "../lib/collapse-animator";
import { toastEvent } from "../lib/events";
import getBoxRulesFields from "./box-rules-fields";
import RemoveBoxRuleModal from "./box-rule-remove";

/**
 * The add rule form wrapped in collapse-wrapper
 * @generator
 * @yields {Element} DOM element displaying modal
 * @param {object} props Property object
 */
function *RulesForm({ rule, disabled, toggleCollapse }) {

  /**
   * Hold loading state.
   *
   * @member {boolean} loading
   */
  let loading = true;
  /**
   * The form boxRulesFields fetched
   *
   * @member {object} fields
   */
  let boxRulesFields = null;
  /**
   * Hold error state.
   *
   * @member {boolean} formError
   */
  let formError = false;

  /**
   * The form id
   *
   * @member {string} id
   */
  const id = rule ? `${rule._id}-box-rules-form` :"box-rules-form";

  /**
   * Called on custom event by the form if it passes validation. Calls
   * saveData with getData().
   *
   * @function submitForm
   * @param {event} ev Custom event
   */
  const submitForm = async () => {
    const form = document.getElementById(id);
    const toastData = { ...form.dataset };

    const multipleFieldIds = Object.entries(boxRulesFields)
      .filter(([key, value]) => value.type === 'checkbox-multiple')
      .map(([key, value]) => value.id);

    // everything else
    const ids = Object.entries(boxRulesFields)
      .filter(([key, value]) => value.type !== 'checkbox-multiple')
      .map(([key, value]) => value.id);

    const data = {};

    // gather data from the form - too troublesome to go back and use field listeners 
    for (const el of form.elements) {
      if (el.type === 'checkbox') {
        if (el.checked) {
          multipleFieldIds.forEach(fid => {
            if (el.name === fid) {
              if (Object.hasOwnProperty.call(data, el.name)) {
                data[el.name].push(el.value);
              } else {
                data[el.name] = [el.value];
              };
            }
          });
        };
      } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') { // exclude buttons and fieldset
        data[el.id] = el.value;
      }
    }

    let src;
    if (rule) {
      let key
      src = "/api/edit-box-rule";
      const l = rule._id.length + 1;
      Object.keys(data).map(el => {
        data[el.slice(l)] = data[el];
        delete data[el];
      });
      data._id = rule._id;
    } else {
      src = "/api/add-box-rule";
    }

    let headers = { "Content-Type": "application/json" };
    PostFetch({ src, data, headers })
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          formError = error;
          loading = false;
          this.refresh();
        } else {
          toggleCollapse();
          // will reload boxes only??
          this.refresh();
          // string notice via form data-* html attributes passed to Form as 'meta'
          const templateString = toastData.template;
          delete toastData.template;
          const notice = parseStringTemplate(templateString, toastData);
          this.dispatchEvent(toastEvent({
            notice,
            bgColour: "black",
            borderColour: "black"
          }));
          setTimeout(() => {
            this.dispatchEvent(
              new CustomEvent("listing.reload", {
                bubbles: true,
              })
            );
          }, 1000);
        }
      })
      .catch((err) => {
        loading = false;
        formError = err;
        this.refresh();
      });
  };

  const formValid = async (ev) => {
    if (ev.detail.valid === true) {
      if (document.getElementById("box-rules-table")) {
        animateFade("box-rules-table", 0.4);
      };
      submitForm();
    } else {
      setTimeout(() => {
        this.dispatchEvent(
          new CustomEvent("collapse.wrapper.resize", {
            bubbles: true,
          })
        );
      }, 100);
    };
  };

  // custom event called by form if passes validation
  this.addEventListener(`${id}.valid`, formValid);

  /**
   * The action attached to the `save` button. Locates the form in the DOM
   * and sends it a custom event to validate. If the form validates it in
   * turns fires the ${id}.valid event to which `formValid` is listening for.
   *
   * @function doSave
   * @fires module:app/form/form-modal#validateEvent
   */
  const doSave = () => {
    const form = document.getElementById(id);
    // fire event listener for Form element - which fires the above
    try {
      // custom event - tell form to run validation
      form.dispatchEvent(
        new CustomEvent(`${id}.validate`, {
          bubbles: true,
        })
      );
    } catch (err) {
      formError = err;
      this.refresh();
    }
  };

  /**
   * Get initial default data
   *
   * @member {object} initialData
   */
  const getInitialData = (rule) => {
    if (rule) {
      const data = {};
      let value;
      Object.keys(rule).map(key => {
        value = rule[key]; 
        if (!Array.isArray(value)) {
          value = [value]; // used to fix old rules
        };
        if (key === "boxes" && !rule.boxes) value = [];
        if (key === "weekday" && !rule.weekday) value = [];
        data[`${rule._id}-${key}`] = value;
      });
      return data;
    } else {
      return {
        // default values
        handle: "box-rule",
        title: "Box Rule",
        tag: "Boxes",
        boxes: [],
        weekday: [],
        value: "",
      };
    };
  };

  const getFields = (currentDisabled) => {
    getBoxRulesFields({rule, disabled: currentDisabled}).then(({error, fields}) => {
      if (error) {
        formError = error;
        loading = false;
        this.refresh();
      } else {
        boxRulesFields = fields;
        loading = false;
        this.refresh();
      }
    });
  };

  getFields(disabled);

  for (const {rule: newRule, disabled: newDisabled} of this) {

    if (disabled !== newDisabled) getFields(newDisabled);

    /*
     * Data passed to form to create the toast message to user on doSave of form
     * These values can be arbitary provided that match the template string
     */
    const toastTemplate = {
      template: newRule ? "Updated box rule." : "Created new box rule",
    };

    yield (
      <Fragment>
        <div class={`w-100 center pa3 ${ 
            loading ? "pb3" : "" 
          } ${
            !newRule ? "ba b--black-60 br2" : ""
          } ${
            !disabled ? "bg-near-white" : ""
          }
          `}>
          {!Boolean(newRule) && (
            <h3 class="tc mb0">Add Box Rule</h3>
          )}
          {loading && <BarLoader />}
          {formError && <Error msg={formError} />}
          {!formError && !loading && (
            <Fragment>
              <Form
                data={getInitialData(newRule)}
                fields={boxRulesFields}
                title="Add box rule"
                id={id}
                hideLabel={Boolean(newRule)}
                meta={toastTemplate}
              />
              {disabled && (
                <div class="tr mt3">
                  <button
                    class="bn outline-0 bg-transparent pa0 no-underline dark-gray dim pointer"
                    name="edit"
                    onclick={toggleCollapse}
                    type="button"
                    title="Edit rule"
                  >
                    <EditIcon />
                    <span class="dn">Edit rule</span>
                  </button>
                  <RemoveBoxRuleModal rule={rule} />
                </div>
              )}
              {!newDisabled && (
                <div class="mb2 mr2 mr2 tr">
                  <Button type="primary" onclick={doSave}>
                    Save
                  </Button>
                  <Button type="secondary" onclick={toggleCollapse}>
                    Cancel
                  </Button>
                </div>
              )}
            </Fragment>
          )}
        </div>
      </Fragment>
    )
    disabled = newDisabled;
  };
};

export default RulesForm;
