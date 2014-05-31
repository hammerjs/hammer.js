/**
 * Manager
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Manager(element, options) {
    EventEmitter.call(this);

    this.enabled = true;
    this.element = element;
    this.options = merge(options || {}, Hammer.defaults);

    this.session = {};
    this.recognizers = [];

    this.input = createInputInstance(this);
    this.touchAction = new TouchAction(this);
    this.touchAction.set(this.options.touchAction);
}

inherit(Manager, EventEmitter, {
    /**
     * enable recognizing
     */
    enable: function() {
        this.enabled = true;
    },

    /**
     * disable recognizing
     */
    disable: function() {
        this.enabled = false;
    },

    /**
     * stop the current session
     */
    stop: function() {
        this.session.stopped = true;
    },

    /**
     * run the recognizers!
     * this is called by the inputHandler function
     * @param {Object} inputData
     */
    recognize: function(inputData) {
        if(!this.enabled || this.session.stopped) {
            return;
        }

        this.touchAction.update(inputData);

        var recognizer;
        var session = this.session;
        var curRecognizer = session.curRecognizer;

        // reset when the last recognizer is done, or this is a new session
        if(!curRecognizer || (curRecognizer && curRecognizer & STATE_RECOGNIZED)) {
            curRecognizer = session.curRecognizer = null;
        }

        // we're in a active recognizer
        for(var i = 0; i < this.recognizers.length; i++) {
            recognizer = this.recognizers[i];

            if(!curRecognizer || recognizer == curRecognizer || recognizer.joins(curRecognizer)) {
                recognizer.update(inputData);
            }

            if(!curRecognizer && recognizer.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED)) {
                curRecognizer = session.curRecognizer = recognizer;
            }
        }
    },

    /**
     * get a recognizer by its event name.
     * if you pass an Recognizer object it just will be returned
     * @param {Recognizer|String} recognizer
     * @returns {Recognizer|Null}
     */
    get: function(recognizer) {
        if(recognizer instanceof Recognizer) {
            return recognizer;
        }

        var recognizers = this.recognizers;
        for(var i = 0; i < recognizers.length; i++) {
            if(recognizers[i].options.event == recognizer) {
                return recognizers[i];
            }
        }
        return null;
    },

    /**
     * add a recognizer to the manager
     * @param {Recognizer} recognizer
     * @returns {Recognizer}
     */
    add: function(recognizer) {
        this.recognizers.push(recognizer);
        recognizer.manager = this;
        return recognizer;
    },

    /**
     * remove a recognizer by name or manager
     * @param {Recognizer|String} recognizer
     * @returns {Recognizer|Null}
     */
    remove: function(recognizer) {
        recognizer = this.get(recognizer);

        var recognizers = this.recognizers;
        for(var i = 0; i < recognizers.length; i++) {
            if(recognizers[i] === recognizer) {
                this.recognizers.splice(i, 1);
                return recognizer;
            }
        }
        return null;
    },

    /**
     * destroy the manager
     * unbinds all events
     */
    destroy: function() {
        this._super.destroy();
        this.session = {};
        this.input.destroy();
        this.element = null;
    }
});
