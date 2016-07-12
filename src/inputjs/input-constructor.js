import boolOrFn from '../utils/bool-or-fn';
import addEventListeners from '../utils/add-event-listeners';
import removeEventListeners from '../utils/remove-event-listeners';
import getWindowForElement from '../utils/get-window-for-element';

/**
 * @private
 * create new input type manager
 * @param {Manager} manager
 * @param {Function} callback
 * @returns {Input}
 * @constructor
 */
export default class Input {
  constructor(manager, callback) {
    let self = this;
    this.manager = manager;
    this.callback = callback;
    this.element = manager.element;
    this.target = manager.options.inputTarget;

    // smaller wrapper around the handler, for the scope and the enabled state of the manager,
    // so when disabled the input events are completely bypassed.
    this.domHandler = function(ev) {
      if (boolOrFn(manager.options.enable, [manager])) {
        self.handler(ev);
      }
    };

    this.init();

  }
  /**
   * @private
   * should handle the inputEvent data and trigger the callback
   * @virtual
   */
  handler() { }

  /**
   * @private
   * bind the events
   */
  init() {
    this.evEl && addEventListeners(this.element, this.evEl, this.domHandler);
    this.evTarget && addEventListeners(this.target, this.evTarget, this.domHandler);
    this.evWin && addEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
  }

  /**
   * @private
   * unbind the events
   */
  destroy() {
    this.evEl && removeEventListeners(this.element, this.evEl, this.domHandler);
    this.evTarget && removeEventListeners(this.target, this.evTarget, this.domHandler);
    this.evWin && removeEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
  }
}
