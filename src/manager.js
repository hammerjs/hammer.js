/**
 * Manager
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Manager(element, options) {
    options = options || {};

    // get the touchAction style property value when option.touchAction is empty
    // otherwise the defaults.touchAction value is used
    options.touchAction = options.touchAction || element.style.touchAction || undefined;

    this.options = merge(options, Hammer.defaults);

    EventEmitter.call(this, element, this.options.domEvents);

    this.session = {};
    this.recognizers = [];

    this.input = createInputInstance(this);
    this.touchAction = new TouchAction(this, this.options.touchAction);

    toggleCssProps(this, true);
}

inherit(Manager, EventEmitter, {
    /**
     * set options
     * @param {String} option
     * @param {*} val
     */
    set: function(option, val) {
        this.options[option] = val;
    },

    /**
     * stop recognizing for this session.
     * This session will be discarded, when a new [input]start event is fired
     */
    stop: function() {
        this.session.stopped = true;
    },

    /**
     * run the recognizers!
     * called by the inputHandler function
     * @param {Object} inputData
     */
    recognize: function(inputData) {
        if(this.session.stopped) {
            return;
        }

        this.touchAction.update(inputData);

        var recognizer;
        var session = this.session;
        var curRecognizer = session.curRecognizer;

        // reset when the last recognizer is done, or this is a new session
        if(!curRecognizer || (curRecognizer && curRecognizer.state & STATE_RECOGNIZED)) {
            curRecognizer = session.curRecognizer = null;
        }

        // we're in a active recognizer
        for(var i = 0; i < this.recognizers.length; i++) {
            recognizer = this.recognizers[i];

            if(!curRecognizer || recognizer == curRecognizer || recognizer.canRecognizeWith(curRecognizer)) {
                recognizer.recognize(inputData);
            } else {
                recognizer.reset();
            }

            if(!curRecognizer && recognizer.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED)) {
                curRecognizer = session.curRecognizer = recognizer;
            }
        }
    },

    /**
     * get a recognizer by its event name.
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
     * remove a recognizer by name or instance
     * @param {Recognizer|String} recognizer
     */
    remove: function(recognizer) {
        var recognizers = this.recognizers;
        recognizer = this.get(recognizer);
        recognizers.splice(inArray(recognizers, recognizer), 1);
    },

    /**
     * destroy the manager and unbinds all events
     */
    destroy: function() {
        this._super.destroy.call(this);

        toggleCssProps(this, false);
        this.session = {};
        this.input.destroy();
        this.element = null;
    }
});

/**
 * add/remove the css properties as defined in manager.options.cssProps
 * @param {Manager} manager
 * @param {Boolean} add
 */
function toggleCssProps(manager, add) {
    var element = manager.element;
    var cssProps = manager.options.cssProps;

    each(cssProps, function(value, name) {
        element.style[prefixed(element.style, name)] = add ? value : '';
    });

    var falseFn = add && function() { return false; };
    if(cssProps.userSelect == 'none') { element.onselectstart = falseFn; }
    if(cssProps.userDrag == 'none') { element.ondragstart = falseFn; }
}
