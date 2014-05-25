var STATE_POSSIBLE = 1;
var STATE_BEGAN = 2;
var STATE_CHANGED = 3;
var STATE_ENDED = 4;
var STATE_RECOGNIZED = STATE_ENDED;
var STATE_CANCELLED = 5;
var STATE_FAILED = 6;

var registeredRecognizers = [];

function Recognizer(name, options, test, handler) {
    this.name = name;
    this.options = options;
    this.test = test;
    this.handler = handler;

    this.state = STATE_POSSIBLE;
    this.enabled = true;

    this.inst = null; // are set when initializing, ref to Hammer
    this.gestures = null; // are set when initializing, ref to Gestures instance (inst.gestures)
}

Recognizer.prototype = {
    /**
     * reset the state
     */
    reset: function() {
        this.state = STATE_POSSIBLE;
    },

    getEventStatePostfix: function() {
        var state = this.state;
        if(state === STATE_BEGAN) {
            return "start";
        } else if(state === STATE_ENDED) {
            return "end";
        } else if(state === STATE_CANCELLED) {
            return "cancel";
        }
        return "";
    },

    /**
     * update the recognizer
     * @param inputData
     */
    update: function(inputData) {
        // if the current state is ended or higher, do a reset
        if(this.state >= STATE_ENDED) {
            this.reset();
        }

        // get detection state
        this.state = this.test(inputData);
        console.log(this.state);

        // call the handler for valid tests
        if(inRange(this.state, STATE_BEGAN, STATE_ENDED)) {
            this.handler(inputData);
        }
    }
};

/**
 * register a recognizer
 * @param {String} name
 * @param {Object} options
 * @param {Function} test
 * @param {Function} handler
 */
function registerRecognizer(name, options, test, handler) {
    merge(DEFAULT_OPTIONS, options);
    registeredRecognizers.push({
        name: name,
        options: options,
        test: test,
        handler: handler
    });
}
