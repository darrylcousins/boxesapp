/**
 * Creates element to render a editable rule
 *
 * @module app/components/box-rule
 * @exports BoxRulesModal
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement, Fragment, Portal} from "@b9g/crank";
import { EditIcon, DeleteIcon } from "../lib/icon";
import RulesForm from "./box-rules-form";
import RemoveBoxRuleModal from "./box-rule-remove";

/**
 * Display a box rule
 *
 * @generator BoxRule
 * @yields {Element} DOM element displaying modal
 * @param {object} props Property object
 */
function* BoxRule({ rule }) {

  /**
   * Hold collapsed state of add form
   *
   * @member {boolean} collapsed
   */
  let disabled = true;

  /*
   * Control the collapse of form
   * @function toggleCollapse
   */
  const toggleForm = () => {
    disabled = !disabled;
    this.refresh();
  };

  for ({rule} of this) {
    yield (
      <div class="flex w-100 mb3 center ba b--black-40 br2">
        <RulesForm rule={rule} disabled={disabled} toggleCollapse={toggleForm} />
      </div>
    );
  };
}

export default BoxRule;
