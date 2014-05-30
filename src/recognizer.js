var STATE_BEGAN = 1;
var STATE_CHANGED = 2;
var STATE_ENDED = 4;
var STATE_RECOGNIZED = STATE_ENDED;
var STATE_CANCELLED = 8;

var STATE_POSSIBLE = 16;
var STATE_FAILED = 32;

function Recognizer(options) {
    this.state = STATE_POSSIBLE;
    this.enabled = true;
    this.options = merge(options || {}, this.defaults);
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
     * set instance
     * @param {Instance} inst
     */
    setInstance: function(inst) {
        this.inst = inst;
    },

    /**
     * default handler
     * @param {Object} input
     */
    handler: function(input) {
        this.inst.trigger(this.options.event + statePostfix(this.state), input);
    },

    /**
     * run together with an other recognizer
     * it adds the current instance also to the other recognizer
     * @param {Recognizer} recognizer
     */
    join: function(recognizer) {
        recognizer = this.inst.get(recognizer);
        if(!this.joins(recognizer)) {
            this.simultaneous.push(recognizer);
            recognizer.join(this);
        }
    },

    /**
     * separate joined recognizers
     * @param {Recognizer} recognizer
     */
    separate: function(recognizer) {
        recognizer = this.inst.get(recognizer);
        var index = inArray(this.simultaneous, recognizer);
        if(index > -1) {
            this.simultaneous.splice(index, 1);
            recognizer.separate(this);
        }
    },

    /**
     * if this recognizer joins the other
     * @param {Recognizer} recognizer
     * @returns {boolean}
     */
    joins: function(recognizer) {
        recognizer = this.inst.get(recognizer);
        return inArray(this.simultaneous, recognizer) > -1;
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

        if(this.state >= STATE_ENDED) {
            this.state = STATE_POSSIBLE;
        }

        // get detection state
        if(this.state <= STATE_POSSIBLE) {
            this.state = this.test(inputData);
        }

        // call the handler for valid tests
        if(this.state <= STATE_CANCELLED) {
            this.handler(inputData);
        }
    }
};

/**
 * used for event triggers
 * @param {String} state
 * @returns {String}
 */
function statePostfix(state) {
    if(state === STATE_BEGAN) {
        return 'start';
    } else if(state === STATE_ENDED) {
        return 'end';
    } else if(state === STATE_CANCELLED) {
        return 'cancel';
    }
    return '';
}
