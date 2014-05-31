var STATE_POSSIBLE = 1;
var STATE_BEGAN = 2;
var STATE_CHANGED = 4;
var STATE_ENDED = 8;
var STATE_RECOGNIZED = STATE_ENDED;
var STATE_CANCELLED = 16;
var STATE_FAILED = 32;

function Recognizer(options) {
    this.manager = null;
    this.options = merge(options || {}, this.defaults);

    this.state = STATE_POSSIBLE;
    this.enabled = true;
    this.simultaneous = [];
}

Recognizer.prototype = {
    /**
     * enable the recognizer
     */
    enable: function() {
        this.enabled = true;
    },

    /**
     * disable the recognizer
     */
    disable: function() {
        this.enabled = false;
    },

    /**
     * default emitter
     * @param {Object} input
     */
    emit: function(input) {
        console.log('emit', this.options.event + statePostfix(this.state), input);
        this.manager.emit(this.options.event + statePostfix(this.state), input);
    },

    /**
     * run together with an other recognizer
     * it adds the current manager also to the other recognizer
     * @param {Recognizer} recognizer
     */
    join: function(recognizer) {
        recognizer = this.manager.get(recognizer);
        if(!this.joins(recognizer)) {
            this.simultaneous.push(recognizer);
            recognizer.join(this);
        }
    },

    /**
     * split joined recognizers
     * @param {Recognizer} recognizer
     */
    split: function(recognizer) {
        recognizer = this.manager.get(recognizer);
        var index = inArray(this.simultaneous, recognizer);
        if(~index) {
            this.simultaneous.splice(index, 1);
            recognizer.split(this);
        }
    },

    /**
     * if this recognizer joins the other
     * @param {Recognizer} recognizer
     * @returns {boolean}
     */
    joins: function(recognizer) {
        recognizer = this.manager.get(recognizer);
        return ~inArray(this.simultaneous, recognizer);
    },

    /**
     * update the recognizer
     * @param {Object} inputData
     */
    update: function(inputData) {
        if(!this.enabled) {
            this.state = STATE_FAILED;
            return;
        }

        if(this.state & STATE_RECOGNIZED) {
            this.state = STATE_POSSIBLE;
        }

        // get detection state
        this.state = this.test(inputData);

        // call the emit for valid tests
        if(this.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED | STATE_CANCELLED)) {
            this.emit(inputData);
        }
    }
};

/**
 * used for event triggers
 * @param {String} state
 * @returns {String}
 */
function statePostfix(state) {
    if(state & STATE_CANCELLED) {
        return 'cancel';
    }
    if(state & STATE_ENDED) {
        return 'end';
    }
    if(state & STATE_CHANGED) {
        return '';
    }
    if(state & STATE_BEGAN) {
        return 'start';
    }
    return '';
}
