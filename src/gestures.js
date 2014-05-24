var registeredGestures = [];

function Gestures(inst) {
    this.inst = inst;
}

/**
 * update
 * @param {Object} inputData
 */
Gestures.prototype.update = function(inputData) {
    each(registeredGestures, function(gesture) {
        gesture.handler(this.inst, inputData, this.inst.sessions[0]);
    }, this);
};

/**
 * register new gestures
 * @static
 * @param {Object} options
 * @param {Function} handler
 */
function registerGesture(options, handler) {
    registeredGestures.push({
        options: options,
        handler: handler
    });
    merge(DEFAULT_OPTIONS, options);
}
