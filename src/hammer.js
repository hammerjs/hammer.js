var HAMMER_OPTIONS = {
    touchAction: 'pan-y'
};

/**
 * hammer instance for an element
 * @param element
 * @param options
 * @constructor
 */
function Hammer(element, options) {
    this.element = element;
    this.options = options || HAMMER_OPTIONS;

    this.sessions = [];

    this.input = new Input(this);
    this.touchAction = new TouchAction(this, this.options.touchAction);
}

Hammer.defaults = HAMMER_OPTIONS;

/**
 * destroy the instance
 */
Hammer.prototype.destroy = function() {
    this.sessions.length = 0;
    this.input.destroy();
};




