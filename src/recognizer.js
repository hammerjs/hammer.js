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
    this.options = merge(options || {}, this.defaults || {});

    // default is enable true
    this.options.enable = (this.options.enable === undefined) ? true : this.options.enable;

    this.state = STATE_POSSIBLE;

    this.simultaneous = {};
    this.requireFail = [];
}

Recognizer.prototype = {
    /**
     * set options
     * @param {String} option
     * @param {*} val
     */
    set: function(option, val) {
        this.options[option] = val;
    },

    /**
     * default emitter
     * @param {Object} input
     */
    emit: function(input) {
        this.manager.emit(this.options.event + stateStr(this.state), input);
    },

    /**
     * recognize simultaneous with an other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    recognizeWith: function(otherRecognizer) {
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        if(!this.canRecognizeWith(otherRecognizer)) {
            this.simultaneous[otherRecognizer.id] = otherRecognizer;
            otherRecognizer.recognizeWith(this);
        }
        return this;
    },

    /**
     * drop the simultaneous link
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    dropRecognizeWith: function(otherRecognizer) {
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        if(this.canRecognizeWith(otherRecognizer)) {
            delete this.simultaneous[otherRecognizer.id];
            otherRecognizer.dropRecognizeWith(this);
        }
        return this;
    },

    /**
     * recognizer can only run when an other is failing
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    requireFailure: function(otherRecognizer) {
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        this.requireFail.push(otherRecognizer);
        return this;
    },

    /**
     * drop the requireFailureOf link
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    dropRequireFailure: function(otherRecognizer) {
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        var index = inArray(this.requireFail, otherRecognizer);
        if(index > -1) {
            this.requireFail.splice(index, 1);
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
        // require failure of other recognizers
        var canRecognize = true;
        for(var i = 0; i < this.requireFail.length; i++) {
            if(this.requireFail[i].state & STATE_FAILED) {
                canRecognize = false;
                break;
            }
        }

        // is is enabled?
        if(!canRecognize || !boolOrFn(this.options.enable, [this, inputData])) {
            this.reset();
            this.state = STATE_FAILED;
            return;
        }

        // reset when we've reached the end
        if(this.state & (STATE_RECOGNIZED | STATE_CANCELLED | STATE_FAILED)) {
            this.state = STATE_POSSIBLE;
        }

        // get detection state
        this.state = this.test(inputData);

        // the recognizer has recognized a gesture
        // so trigger an event
        if(this.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED | STATE_CANCELLED)) {
            this.emit(inputData);
        }
    },

    /**
     * called when the gesture isn't allowed to recognize
     * like when another is being recognized or it is disabled
     * @virtual
     */
    reset: function() { }
};

/**
 * get a usable string, used as event postfix
 * @param {Const} state
 * @returns {String} state
 */
function stateStr(state) {
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

/**
 * get a recognizer by name if it is bound to a manager
 * @param {Recognizer|String} otherRecognizer
 * @param {Recognizer} recognizer
 * @returns {Recognizer}
 */
function getRecognizerByNameIfManager(otherRecognizer, recognizer) {
    var manager = recognizer.manager;
    if(manager) {
        return manager.get(otherRecognizer);
    }
    return otherRecognizer;
}
