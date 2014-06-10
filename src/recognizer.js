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
        this.manager.emit(this.options.event + this.stateStr(), input);
    },

    /**
     * run together with an other recognizer
     * it adds the current manager also to the other recognizer
     * @param {Recognizer} recognizer
     * @returns {Recognizer} this
     */
    join: function(recognizer) {
        recognizer = this.manager.get(recognizer);
        if(!this.joins(recognizer)) {
            this.simultaneous.push(recognizer);
            recognizer.join(this);
        }
        return this;
    },

    /**
     * split joined recognizers
     * @param {Recognizer} recognizer
     * @returns {Recognizer} this
     */
    split: function(recognizer) {
        recognizer = this.manager.get(recognizer);
        var index = inArray(this.simultaneous, recognizer);
        if(index > -1) {
            this.simultaneous.splice(index, 1);
            recognizer.split(this);
        }
        return this;
    },

    /**
     * if this recognizer is joining the other
     * @param {Recognizer} recognizer
     * @returns {boolean}
     */
    joins: function(recognizer) {
        return inArray(this.simultaneous, this.manager.get(recognizer)) > -1;
    },

    /**
     * update the recognizer
     * @param {Object} inputData
     */
    recognize: function(inputData) {

        if(!this.enabled) {
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
     * called when the gesture isn't being updated by the manager update cycle
     * can be used by Recognizers that extend from this object
     * @virtual
     */
    reset: function() { },

    /**
     * un-register the recognizer from the manager
     */
    remove: function() {
        this.manager.remove(this);
    },

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
