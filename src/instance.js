/**
 * hammer instance for an element
 * @param element
 * @param options
 * @constructor
 */
function Instance(element, options) {
    this.element = element;
    this.options = options || {};

    this.sessions = [];
    this.input = new Input(this);
}

/**
 * destroy the instance
 */
Instance.prototype.destroy = function() {
    this.sessions.length = 0;
    this.input.destroy();
};

