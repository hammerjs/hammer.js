var DEFAULT_OPTIONS = {
    touchAction: "pan-y"
};

/**
 * Hammer instance for an element
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Hammer(element, options) {
    this.element = element;
    this.options = options || Hammer.defaults;

    this.sessions = [];

    this.input = new Input(this);
    this.touchAction = new TouchAction(this, this.options.touchAction);
    this.gestures = new Gestures(this);
}

Hammer.defaults = DEFAULT_OPTIONS;

/**
 * destroy the instance
 */
Hammer.prototype.destroy = function() {
    this.sessions.length = 0;
    this.input.destroy();
    this.element = null;
};

/**
 * @param {String} gesture
 * @param {Object} eventData
 * @returns {Hammer}
 */
Hammer.prototype.trigger = function(gesture, eventData) {
    // create DOM event
    var event = document.createEvent("Event");
    event.initEvent(gesture, true, true);
    event.gesture = eventData;

    this.element.dispatchEvent(event);
    return this;
};
