var STATE_POSSIBLE = 1;
var STATE_BEGAN = 2;
var STATE_CHANGED = 4;
var STATE_ENDED = 8;
var STATE_RECOGNIZED = STATE_ENDED;
var STATE_CANCELLED = 16;
var STATE_FAILED = 32;

/**
 * Recognizer
 * @constructor
 * @param {Object} options
 */
function Recognizer(options) {
    this.id = uniqueId();

    this.manager = null;
    this.options = merge(options || {}, this.defaults);

    this.enabled = (typeof this.options.enable == TYPE_UNDEFINED) ? true : this.options.enable;
    this.state = STATE_POSSIBLE;
    this.simultaneous = {};
}

Recognizer.prototype = {
    /**
     * enable the recognizer
     * if the argument is a function, it is triggered on every recognize cycle
     * @param {Boolean|Function} enable
     */
    enable: function(enable) {
        this.enabled = enable;
    },

    /**
     * default emitter
     * @param {Object} input
     */
    emit: function(input) {
        this.manager.emit(this.options.event + this.stateStr(), input);
    },

    /**
     * recognize simultaneous with an other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    recognizeWith: function(otherRecognizer) {
        otherRecognizer = this.manager.get(otherRecognizer);
        if(!this.canRecognizeWith(otherRecognizer)) {
            this.simultaneous[otherRecognizer.id] = otherRecognizer;
            otherRecognizer.recognizeWith(this);
        }
        return this;
    },

    /**
     * don't recognize simultaneous with an other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    dontRecognizeWith: function(otherRecognizer) {
        otherRecognizer = this.manager.get(otherRecognizer);
        if(this.canRecognizeWith(otherRecognizer)) {
            delete this.simultaneous[otherRecognizer.id];
            otherRecognizer.dontRecognizeWith(this);
        }
        return this;
    },

    /**
     * if the recognizer can recognize simultaneous with an other recognizer
     * @param {Recognizer} otherRecognizer
     * @returns {Boolean}
     */
    canRecognizeWith: function(otherRecognizer) {
        return !!this.simultaneous[otherRecognizer.id];
    },

    /**
     * update the recognizer
     * @param {Object} inputData
     */
    recognize: function(inputData) {
        if(!boolFn(this.enabled, this, [inputData])) {
            this.reset();
            this.state = STATE_FAILED;
            return;
        }

        if(this.state & (STATE_RECOGNIZED | STATE_CANCELLED | STATE_FAILED)) {
            this.state = STATE_POSSIBLE;
        }

        // get detection state
        this.state = this.test(inputData);

        // call the emit for valid tests
        if(this.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED | STATE_CANCELLED)) {
            this.emit(inputData);
        }
    },

    /**
     * called when the gesture has been recognized and when not allowed to
     * recognize (by the option.shouldRecognize method)
     * @virtual
     */
    reset: function() { },

    /**
     * get a usable string, used as event postfix
     * @returns {String} state
     */
    stateStr: function() {
        var state = this.state;
        if(state & STATE_CANCELLED) {
            return 'cancel';
        } else if(state & STATE_ENDED) {
            return 'end';
        } else if(state & STATE_CHANGED) {
            return '';
        } else if(state & STATE_BEGAN) {
            return 'start';
        }
        return '';
    }
};
