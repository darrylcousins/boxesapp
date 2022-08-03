/**
 * A component for file selection
 *
 * @module app/form/file
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";
import Error from "../../lib/error";

// TODO 1. add file types allowed, 2. add multiple
/**
 * A component to render file input for a form
 *
 * @function FileField
 * @param {object} props The property object
 * @param {string} props.label The label text
 * @param {string} props.id The form unique identifier for the field
 * @param {string} props.size The width of the field as per tachyons width values
 * @param {boolean} props.required Is this a required field
 * @param {boolean} props.valid Is the current value valid
 * @yields {Element} The rendered file input component
 */
function* FileField(props) {
  const { label, id, size, required } = props;
  let { valid } = props;
  let selected = null;
  let error = false;

  /**
   * Event handler on change - i.e. a file selected by user
   * This fails on a single windows computer that does NOT have a `type`
   * if (selected.type) // empty on windows
   *
   * @function handleChange
   * @param {object} ev The event
   * @listens change
   */
  const handleChange = async (ev) => {
    if (ev.target.tagName === "INPUT" && ev.target.type === "file") {
      [selected] = ev.target.files; // note that only the first file is used TODO multiple
      error = false;
      this.refresh();
      if (!error) {
        const showFile = document.getElementById(`selected-${id}`);
        showFile.classList.remove("dn");
      }
    }
  };

  this.addEventListener("change", handleChange);

  /**
   * Event handler when {@link
   * module:form/form-modal~FormModalWrapper|FormModalWrapper} sends for data
   *
   * @function dataInvalid
   * @param {object} ev The event
   * @listens form.data.invalid
   */
  const dataInvalid = async (ev) => {
    valid = ev.detail.valid;
    this.refresh();
  };

  this.addEventListener("data.form.invalid", dataInvalid);

  /**
   * Event handler when {@link
   * module:form/form-modal~FormModalWrapper|FormModalWrapper} sends for data
   *
   * @function collectAndSendData
   * @param {object} ev The event
   * @listens form.data.feed
   */
  const collectAndSendData = (ev) => {
    const [value] = ev.target.files;
    if (ev.target.id === id) {
      this.dispatchEvent(
        new CustomEvent("form.data.feed", {
          bubbles: true,
          detail: {
            id,
            value,
          },
        })
      );
    }
  };

  this.addEventListener("form.data.collect", collectAndSendData);

  while (true)
    yield (
      <div class={`fl w-100 w-${size}-ns`}>
        <div class="tl ph2 mt1 ml0">
          <label
            htmlFor={id}
            for={id}
            class="pointer link dim mid-gray f6 fw6 dib mr3 ba b--mid-gray br2 pa2"
            title="Select file"
          >
            Select file
            <input type="file" name={id} id={id} hidden required={required} />
          </label>
          <span
            class={`small mt1 fg-streamside-orange ${valid ? "hidden" : ""}`}
          >
            Please select a file
          </span>
          {selected && (
            <div
              class="dark-gray mv2 pa3 br3 ba b--dark-gray bg-washed-blue dn"
              id={`selected-${id}`}
            >
              Selected file for import:&nbsp;
              <span class="code b">{selected.name}</span>.
            </div>
          )}
          {error && <Error msg={error} />}
        </div>
      </div>
    );
}

export default FileField;