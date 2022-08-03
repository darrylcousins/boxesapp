/**
 * Renders a view of the app to edit settings
 *
 * @module app/components/app-view
 * @exports AppView
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment } from "@b9g/crank";
import BarLoader from "../lib/bar-loader";
import Error from "../lib/error";
import { Fetch } from "../lib/fetch";
import { animateFadeForAction, hasOwnProp } from "../helpers";

function *AppView({settings}) {

  /**
   * Pass over the setting data to Settings
   *
   * @function mouseOverSetting
   * @param {event} ev A hover event on this element
   * @listens window.hover
   */
  const mouseOverSetting = async (ev) => {
    const element = ev.target;
    if (element.hasAttribute("data-settings-types") && element.hasAttribute("data-settings-keys")) {
      const types = JSON.parse(element.getAttribute("data-settings-types"));
      const keys = JSON.parse(element.getAttribute("data-settings-keys"));
      if (types.length !== keys.length) {
        console.warn("Types length does not match keys length");
        return;
      };
      this.dispatchEvent(
        new CustomEvent("appview.mouseover", {
          bubbles: true,
          detail: {types, keys}
        })
      );
      return;
    };
  };

  /**
   * Moved off a component with editable settings
   *
   * @function mouseOutSetting
   * @param {event} ev A hover event on this element
   * @listens window.hover
   */
  const mouseOutSetting = async (ev) => {
    this.dispatchEvent(
      new CustomEvent("appview.mouseout", {
        bubbles: true,
      })
    );
  };

  /**
   * Pass over the setting data to Settings
   *
   * @function mouseClickSetting
   * @param {event} ev A hover event on this element
   * @listens window.hover
   */
  const mouseClickSetting = async (ev) => {
    const element = ev.target;
    if (element.hasAttribute("data-settings-types") && element.hasAttribute("data-settings-keys")) {
      const types = JSON.parse(element.getAttribute("data-settings-types"));
      const keys = JSON.parse(element.getAttribute("data-settings-keys"));
      if (types.length !== keys.length) {
        console.warn("Types length does not match keys length");
        return;
      };
      this.dispatchEvent(
        new CustomEvent("appview.mouseclick", {
          bubbles: true,
          detail: {types, keys}
        })
      );
      return;
    };
  };

  this.addEventListener("click", mouseClickSetting);

  /** Provide access to the app settings
   *
   * @method {object} getSetting
   * @returns {boolead} Returns true if the property exists on the object
   */
  const getSetting = (type, key) => {
    if (hasOwnProp.call(settings, type)) {
      const partSettings = settings[type];
      if (hasOwnProp.call(partSettings, key)) {
        return partSettings[key];
      };
    };
    return "";
  };

  //getSettings();

  for (const _ of this) {
    yield (
      <div>
        <div class="overflow-visible" id="app-view">
          {Object.keys(settings).length > 0 && (
            <div id="container-box" class="mw6 center ba b--black80 ma1 pa2 br2">
              <div id="dateSelector">
                <div class="notice pointer"
                    style={{
                      "color": getSetting("Colour", "notice-fg"),
                      "background-color": getSetting("Colour", "notice-bg"),
                    }}
                >
                  <p
                    data-settings-types={`["Translation", "Colour", "Colour"]`}
                    data-settings-keys={`["notice-choose-date", "notice-bg", "notice-fg"]`}
                    onmouseover={mouseOverSetting}
                    onmouseout={mouseOutSetting}
                    title="Click to edit"
                    >{getSetting("Translation", "notice-choose-date")}</p>
                </div>
                <div class="relative">
                  <div class="relative">
                    <button class="select-dropdown-button"
                      title="Select Date"
                      id="selectDate"
                      type="button"
                      data-settings-types={`["Translation"]`}
                      data-settings-keys={`["select-delivery-date"]`}
                      onmouseover={mouseOverSetting}
                      onmouseout={mouseOutSetting}
                      title="Click to edit"
                    >
                      {getSetting("Translation", "select-delivery-date")}&nbsp;&nbsp;&nbsp;▾
                    </button>
                  </div>
                </div>
                <div class="notice pointer"
                      style={{
                        "color": getSetting("Colour", "notice-fg"),
                        "background-color": getSetting("Colour", "notice-bg"),
                      }}
                >
                  <p
                    data-settings-types={`["Translation", "Colour", "Colour"]`}
                    data-settings-keys={`["notice-no-boxes", "notice-bg", "notice-fg"]`}
                    onmouseover={mouseOverSetting}
                    onmouseout={mouseOutSetting}
                    title="Click to edit"
                    >{getSetting("Translation", "notice-no-boxes")}</p>
                </div>
                <div class="notice pointer"
                      style={{
                        "color": getSetting("Colour", "notice-fg"),
                        "background-color": getSetting("Colour", "notice-bg"),
                      }}
                    data-settings-types={`["Colour", "Colour"]`}
                    data-settings-keys={`["notice-bg", "notice-fg"]`}
                    onmouseover={mouseOverSetting}
                    onmouseout={mouseOutSetting}
                    title="Click to edit"
                  >
                    <p>Box or weekday specific rules. Edit these in boxes: </p>
                  <code class="red ph1 br2">Boxes &gt; ☰ &gt; Rules</code>
                </div>
              </div>
              <div id="defaultbox-5571286794406"
                   class="collapsible">
                <div id="defaultBox">
                  <div class="listing-title pointer"
                      data-settings-types={`["Translation"]`}
                      data-settings-keys={`["included-products-title"]`}
                      onmouseover={mouseOverSetting}
                      onmouseout={mouseOutSetting}
                      title="Click to edit"
                  >
                    {getSetting("Translation", "included-products-title")}
                  </div>
                  <div class="pill-wrapper">
                    <div class="pill pointer"
                        style={{
                          "color": getSetting("Colour", "included-product-fg-hi"),
                          "background-color": getSetting("Colour", "included-product-bg"),
                          "border-color": getSetting("Colour", "included-product-bg")
                        }}
                        data-settings-types={`["Colour", "Colour"]`}
                        data-settings-keys={`["included-product-bg", "included-product-fg-hi"]`}
                        onmouseover={mouseOverSetting}
                        onmouseout={mouseOutSetting}
                        title="Click to edit"
                    >
                      Beetroot 3x (2) $5.00
                    </div>
                    <div class="pill pointer"
                        style={{
                          "color": getSetting("Colour", "included-product-fg"),
                          "background-color": getSetting("Colour", "included-product-bg"),
                          "border-color": getSetting("Colour", "included-product-bg")
                        }}
                        data-settings-types={`["Colour", "Colour"]`}
                        data-settings-keys={`["included-product-bg", "included-product-fg"]`}
                        onmouseover={mouseOverSetting}
                        onmouseout={mouseOutSetting}
                        title="Click to edit"
                    >
                      Cabbage Green
                    </div>
                    <div class="pill pointer"
                        style={{
                          "color": getSetting("Colour", "available-product-fg"),
                          "background-color": getSetting("Colour", "available-product-bg"),
                          "border-color": getSetting("Colour", "available-product-bg")
                        }}
                        data-settings-types={`["Colour", "Colour"]`}
                        data-settings-keys={`["available-product-bg", "available-product-fg"]`}
                        onmouseover={mouseOverSetting}
                        onmouseout={mouseOutSetting}
                        title="Click to edit"
                    >
                      Cauliflower (1) $5.00 ✘
                    </div>
                    <div class="pill pointer"
                        style={{
                          "color": getSetting("Colour", "available-product-fg-hi"),
                          "background-color": getSetting("Colour", "available-product-bg"),
                          "border-color": getSetting("Colour", "available-product-bg")
                        }}
                        data-settings-types={`["Colour", "Colour"]`}
                        data-settings-keys={`["available-product-bg", "available-product-fg-hi"]`}
                        onmouseover={mouseOverSetting}
                        onmouseout={mouseOutSetting}
                        title="Click to edit"
                    >
                      Broccoli (2) $8.00 ✘
                    </div>
                  </div>
                  <div>
                    <div class="listing-title pointer"
                      data-settings-types={`["Translation"]`}
                      data-settings-keys={`["excluded-products-title"]`}
                      onmouseover={mouseOverSetting}
                      onmouseout={mouseOutSetting}
                      title="Click to edit"
                    >
                      {getSetting("Translation", "excluded-products-title")}
                    </div>
                    <div
                      class="pointer"
                      data-settings-types={`["Translation"]`}
                      data-settings-keys={`["substitute-item"]`}
                      onmouseover={mouseOverSetting}
                      onmouseout={mouseOutSetting}
                      title="Click to edit"
                    >
                      {getSetting("Translation", "substitute-item")}
                    </div>
                    <div class="notice mt2"
                          style={{
                            "color": getSetting("Colour", "notice-fg"),
                            "background-color": getSetting("Colour", "notice-bg"),
                          }}
                    >
                      <p
                        class="pointer"
                        data-settings-types={`["Translation", "Colour", "Colour"]`}
                        data-settings-keys={`["offer-custom-box", "notice-bg", "notice-fg"]`}
                        onmouseover={mouseOverSetting}
                        onmouseout={mouseOutSetting}
                        title="Click to edit"
                      >{getSetting("Translation", "offer-custom-box")}</p>
                    </div>
                    <div class="pill-wrapper">
                      <div class="pill pointer"
                        style={{
                          "color": getSetting("Colour", "excluded-product-fg"),
                          "background-color": getSetting("Colour", "excluded-product-bg"),
                          "border-color": getSetting("Colour", "excluded-product-bg")
                        }}
                        data-settings-types={`["Colour", "Colour"]`}
                        data-settings-keys={`["excluded-product-bg", "excluded-product-fg"]`}
                        onmouseover={mouseOverSetting}
                        onmouseout={mouseOutSetting}
                        title="Click to edit"
                      >
                        Carrots 1kg ✘
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div id="toggleInput"
                   class="pointer flex-row"
                   style="margin-bottom: 1em;">
                <div class="flex-left">
                  <label for="toggleEditBox"
                      class="db pointer"
                      style="margin: 0.5em 0px 0px;"
                      data-settings-types={`["Translation"]`}
                      data-settings-keys={`["customize-box"]`}
                      onmouseover={mouseOverSetting}
                      onmouseout={mouseOutSetting}
                      title="Click to edit"
                    >
                    <input class="checkbox"
                         type="checkbox"
                         id="toggleEditBox" />
                    {getSetting("Translation", "customize-box")}
                  </label>
                </div>
                <div class="flex-right">
                  <div class="button-wrapper">
                    <button title="Change product quantities"
                        id="qtyForm"
                        type="button"
                        style={{
                          "color": getSetting("Colour", "button-foreground"),
                          "background-color": getSetting("Colour", "button-background"),
                          "border-color": getSetting("Colour", "button-background")
                        }}
                        data-settings-types={`["Translation", "Colour", "Colour"]`}
                        data-settings-keys={`["edit-quantities", "button-background", "button-foreground"]`}
                        onmouseover={mouseOverSetting}
                        onmouseout={mouseOutSetting}
                        title="Click to edit"
                    >
                      {getSetting("Translation", "edit-quantities")}
                    </button>
                  </div>
                </div>
              </div>
              <div id="addons-5571286794406"
                   class="collapsible">
                <div id="productSelector">
                  <div>
                    <div class="relative">
                      <button class="select-dropdown-button"
                          title="Remove items from your box"
                          id="removeItem"
                          type="button"
                          data-settings-types={`["Translation"]`}
                          data-settings-keys={`["select-excludes"]`}
                          onmouseover={mouseOverSetting}
                          onmouseout={mouseOutSetting}
                          title="Click to edit"
                        >
                        {getSetting("Translation", "select-excludes")}
                        &nbsp;&nbsp;&nbsp;▾
                      </button>
                    </div>
                    <div class="relative">
                      <button class="select-dropdown-button"
                        title="Add items to your box"
                        id="addItem"
                        type="button"
                        data-settings-types={`["Translation"]`}
                        data-settings-keys={`["select-addons"]`}
                        onmouseover={mouseOverSetting}
                        onmouseout={mouseOutSetting}
                        title="Click to edit"
                      >
                        {getSetting("Translation", "select-addons")}
                        &nbsp;&nbsp;&nbsp;▾
                      </button>
                    </div>
                  </div>
                  <div class="listing-title pointer"
                        data-settings-types={`["Translation"]`}
                        data-settings-keys={`["available-products-title"]`}
                        onmouseover={mouseOverSetting}
                        onmouseout={mouseOutSetting}
                        title="Click to edit"
                    >
                    {getSetting("Translation", "available-products-title")}
                  </div>
                  <div class="pill-wrapper">
                    <div class="pill pointer"
                        title="Add to your box"
                        style={{
                          "color": getSetting("Colour", "available-product-fg"),
                          "background-color": getSetting("Colour", "available-product-bg"),
                          "border-color": getSetting("Colour", "available-product-bg")
                        }}
                        data-settings-types={`["Colour", "Colour"]`}
                        data-settings-keys={`["available-product-bg", "available-product-fg"]`}
                        onmouseover={mouseOverSetting}
                        onmouseout={mouseOutSetting}
                        title="Click to edit"
                      >
                      Carrots 1kg $5.00
                    </div>
                  </div>
                </div>
              </div>
              <div class="button-wrapper"
                   id="add-button-wrapper">
                <div class="notice"
                    style={{
                      "color": getSetting("Colour", "notice-fg"),
                      "background-color": getSetting("Colour", "notice-bg"),
                    }}
                >
                  <p class="pointer"
                    data-settings-types={`["Translation", "Colour", "Colour"]`}
                    data-settings-keys={`["existing-box-warn", "notice-bg", "notice-fg"]`}
                    onmouseover={mouseOverSetting}
                    onmouseout={mouseOutSetting}
                    title="Click to edit"
                  >{getSetting("Translation", "existing-box-warn")}</p>
                </div>
                <button type="submit"
                      name="add"
                      id="add-button"
                      style={{
                        "color": getSetting("Colour", "button-foreground"),
                        "background-color": getSetting("Colour", "button-background"),
                        "border-color": getSetting("Colour", "button-background")
                      }}
                      data-settings-types={`["Translation", "Colour", "Colour"]`}
                      data-settings-keys={`["add-to-cart", "button-background", "button-foreground"]`}
                      onmouseover={mouseOverSetting}
                      onmouseout={mouseOutSetting}
                      title="Click to edit"
                    >
                    {getSetting("Translation", "add-to-cart")}
                </button>
                <button type="submit"
                    name="add"
                    id="update-button"
                    style={{
                      "color": getSetting("Colour", "button-foreground"),
                      "background-color": getSetting("Colour", "button-background"),
                      "border-color": getSetting("Colour", "button-background")
                    }}
                    data-settings-types={`["Translation", "Colour", "Colour"]`}
                    data-settings-keys={`["update-selection", "button-background", "button-foreground"]`}
                    onmouseover={mouseOverSetting}
                    onmouseout={mouseOutSetting}
                    title="Click to edit"
                    >
                    {getSetting("Translation", "update-selection")}
                </button>
                <div class="relative">
                  <div class="popup-container relative"
                      style={{
                        "color": getSetting("Colour", "warn-fg"),
                        "background-color": getSetting("Colour", "warn-bg"),
                        "opacity": 1,
                        "margin-bottom": "1em",
                      }}
                    >
                    <button class="close-button"
                         name="dismiss"
                         type="button"
                         title="Dismiss">
                       ✖<span class="dn">Dismiss</span>
                    </button>
                    <div id="popup-inner-5571286696102">
                      <p class="pointer"
                        data-settings-types={`["Translation", "Colour", "Colour"]`}
                        data-settings-keys={`["existing-box-confirm", "warn-bg", "warn-fg"]`}
                        onmouseover={mouseOverSetting}
                        onmouseout={mouseOutSetting}
                        title="Click to edit"
                        >{getSetting("Translation", "existing-box-confirm")}</p>
                      <div class="button-wrapper">
                        <button type="button"
                          name="cancel"
                          style={{
                             "color": getSetting("Colour", "button-foreground"),
                             "background-color": getSetting("Colour", "button-background"),
                             "border-color": getSetting("Colour", "button-background")
                          }}
                          data-settings-types={`["Colour", "Colour"]`}
                          data-settings-keys={`["button-background", "button-foreground"]`}
                          onmouseover={mouseOverSetting}
                          onmouseout={mouseOutSetting}
                          title="Click to edit"
                        >
                        Not yet
                        </button>
                        <button type="button"
                            name="yes"
                            style={{
                               "color": getSetting("Colour", "button-foreground"),
                               "background-color": getSetting("Colour", "button-background"),
                               "border-color": getSetting("Colour", "button-background")
                            }}
                            data-settings-types={`["Colour", "Colour"]`}
                            data-settings-keys={`["button-background", "button-foreground"]`}
                            onmouseover={mouseOverSetting}
                            onmouseout={mouseOutSetting}
                            title="Click to edit"
                          >
                          Yes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div id="quantityModal" style="opacity: 1; position: relative">
                <button class="close-button" name="close" type="button" id="qtyFormClose" title="Close modal">
                  ✖<span class="dn">Close modal</span>
                </button>
                <div class="listing-wrapper">
                  <div class="listing-title pointer"
                    data-settings-types={`["Translation"]`}
                    data-settings-keys={`["modal-included-title"]`}
                    onmouseover={mouseOverSetting}
                    onmouseout={mouseOutSetting}
                    title="Click to edit"
                    >
                    {getSetting("Translation", "modal-included-title")}:
                  </div>
                  <div class="input-wrapper">
                    <input class="input-title" type="text" readonly name="title" value="Beetroot 3x">
                    </input>
                    <input class="input-quantity" type="number" steps="1" min="0" name="quantity" value="2" autocomplete="off">
                    </input>
                    <input class="input-price" type="text" readonly name="title" value="$5.00">
                    </input>
                  </div>
                  <div class="input-wrapper">
                    <input class="input-title" type="text" readonly name="title" value="Cabbage Green">
                    </input>
                    <input class="input-quantity" type="number" steps="1" min="0" name="quantity" value="1" autocomplete="off">
                    </input>
                    <input class="input-price" type="text" readonly name="title" value="$0.00">
                    </input>
                  </div>
                  <div class="listing-title pointer"
                    data-settings-types={`["Translation"]`}
                    data-settings-keys={`["modal-addons-title"]`}
                    onmouseover={mouseOverSetting}
                    onmouseout={mouseOutSetting}
                    title="Click to edit"
                    >
                    {getSetting("Translation", "modal-addons-title")}:
                  </div>
                  <div class="input-wrapper">
                    <input class="input-title" type="text" readonly name="title" value="Broccoli">
                    </input>
                    <input class="input-quantity" type="number" steps="1" min="0" name="quantity" value="2" autocomplete="off">
                    </input>
                    <input class="input-price" type="text" readonly name="title" value="$8.00">
                    </input>
                  </div>
                  <div class="input-wrapper">
                    <input class="input-title" type="text" readonly name="title" value="Cauliflower">
                    </input>
                    <input class="input-quantity" type="number" steps="1" min="0" name="quantity" value="1" autocomplete="off">
                    </input>
                    <input class="input-price" type="text" readonly name="title" value="$5.00">
                    </input>
                  </div>
                  <div class="tr button-wrapper">
                    <button name="close"
                            type="button"
                            id="qtyFormClose"
                            style={{
                              "color": getSetting("Colour", "button-foreground"),
                              "background-color": getSetting("Colour", "button-background"),
                              "border-color": getSetting("Colour", "button-background")
                            }}
                            data-settings-types={`["Colour", "Colour"]`}
                            data-settings-keys={`["button-background", "button-foreground"]`}
                            onmouseover={mouseOverSetting}
                            onmouseout={mouseOutSetting}
                            title="Click to edit"
                        >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
}

export default AppView;
