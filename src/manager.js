var STOP = 1;
var FORCED_STOP = 2;

/**
 * Manager
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Manager(element, options) {
    this.options = assign({}, Hammer.defaults, options || {});

    this.options.inputTarget = this.options.inputTarget || element;

    this.handlers = {};
    this.session = {};
    this.recognizers = [];
    this.oldCssProps = {};

    this.element = element;
    this.input = createInputInstance(this);
    this.touchAction = new TouchAction(this, this.options.touchAction);

    toggleCssProps(this, true);

    each(this.options.recognizers, function(item) {
        var recognizer = this.add(new (item[0])(item[1]));
        item[2] && recognizer.recognizeWith(item[2]);
        item[3] && recognizer.requireFailure(item[3]);
    }, this);
}

Manager.prototype = {
    constructor: Manager,

    /**
     * set options
     * @param {Object} options
     * @returns {Manager}
     */
    set: function(options) {
        if (options.cssProps) {
            toggleCssProps(this, false);
        }
        assign(this.options, options);

        // Options that need a little more setup
        if (options.cssProps) {
            toggleCssProps(this, true);
        }
        if (options.touchAction) {
            this.touchAction.update();
        }
        if (options.inputTarget && this.input) {
            // Clean up existing event listeners and reinitialize
            this.input.destroy();
            this.input.target = options.inputTarget;
            this.input.init();
        }
        if ((options.enable !== undefined && !boolOrFn(this.options.enable, [this])) ||
            options.pointerTypes !== undefined) {
            this.stop(true);
            this.input && this.input.reset();
            each(this.recognizers, function(recognizer) {
                recognizer.reset();
                recognizer.state = STATE_POSSIBLE;
            });
        }
        return this;
    },

    /**
     * stop recognizing for this session.
     * This session will be discarded, when a new [input]start event is fired.
     * When forced, the recognizer cycle is stopped immediately.
     * @param {Boolean} [force]
     */
    stop: function(force) {
        this.session.stopped = force ? FORCED_STOP : STOP;
        if (force) {
            each(this.recognizers, function(recognizer) {
                recognizer.reset();
            });
        }
    },

    /**
     * run the recognizers!
     * called by the inputHandler function on every movement of the pointers (touches)
     * it walks through all the recognizers and tries to detect the gesture that is being made
     * @param {Object} inputData
     */
    recognize: function(inputData) {
        var session = this.session;
        if (session.stopped || !this.element) {
            return;
        }

        // run the touch-action polyfill
        this.touchAction.preventDefaults(inputData);

        var recognizer;
        var recognizers = this.recognizers.slice();

        // this holds the recognizer that is being recognized.
        // so the recognizer's state needs to be BEGAN, CHANGED, ENDED or RECOGNIZED
        // if no recognizer is detecting a thing, it is set to `null`
        var curRecognizer = session.curRecognizer;

        // reset when the last recognizer is recognized, cancelled, or failed
        // or when we're in a new session
        if (!curRecognizer || (curRecognizer.state & (STATE_RECOGNIZED | STATE_CANCELLED | STATE_FAILED))) {
            curRecognizer = session.curRecognizer = null;
        }

        var i = 0;
        while (i < recognizers.length) {
            recognizer = recognizers[i];
            if (recognizer.manager === this) {
                // find out if we are allowed try to recognize the input for this one.
                // 1.   allow if the session is NOT forced stopped (see the .stop() method)
                // 2.   allow if we still haven't recognized a gesture in this session, or the this recognizer is the one
                //      that is being recognized.
                // 3.   allow if the recognizer is allowed to run simultaneous with the current recognized recognizer.
                //      this can be setup with the `recognizeWith()` method on the recognizer.
                if (session.stopped !== FORCED_STOP && ( // 1
                        !curRecognizer || recognizer == curRecognizer || // 2
                        recognizer.canRecognizeWith(curRecognizer))) { // 3
                    recognizer.recognize(inputData);
                } else {
                    recognizer.reset();
                }

                // if the recognizer has been recognizing the input as a valid gesture, we want to store this one as the
                // current active recognizer. but only if we don't already have an active recognizer
                curRecognizer = session.curRecognizer;
                if (!curRecognizer && recognizer.manager === this &&
                    recognizer.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED)) {
                    curRecognizer = session.curRecognizer = recognizer;
                }
            }
            i++;
        }
    },

    /**
     * get a recognizer by its event name.
     * @param {Recognizer|String} recognizer
     * @returns {Recognizer|Null}
     */
    get: function(recognizer) {
        if (recognizer instanceof Recognizer) {
            return recognizer;
        }

        var recognizers = this.recognizers;
        for (var i = 0; i < recognizers.length; i++) {
            if (recognizers[i].options.event == recognizer) {
                return recognizers[i];
            }
        }
        return null;
    },

    /**
     * add a recognizer to the manager
     * existing recognizers with the same event name will be removed
     * @param {Recognizer} recognizer
     * @returns {Recognizer|Manager}
     */
    add: function(recognizer) {
        if (invokeArrayArg(recognizer, 'add', this)) {
            return this;
        }

        // remove existing
        var existing = this.get(recognizer.options.event);
        if (existing) {
            this.remove(existing);
        }

        this.recognizers.push(recognizer);
        recognizer.manager = this;

        this.touchAction.update();
        return recognizer;
    },

    /**
     * remove a recognizer by name or instance
     * @param {Recognizer|String} recognizer
     * @returns {Manager}
     */
    remove: function(recognizer) {
        if (invokeArrayArg(recognizer, 'remove', this)) {
            return this;
        }

        recognizer = this.get(recognizer);

        // let's make sure this recognizer exists
        if (recognizer) {
            var recognizers = this.recognizers;
            var index = inArray(recognizers, recognizer);

            if (index !== -1) {
                recognizers.splice(index, 1);
                if (this.session.curRecognizer === recognizer) {
                    this.session.curRecognizer = null;
                }
                recognizer.reset();
                recognizer.manager = null;
                this.touchAction.update();
            }
        }

        return this;
    },

    /**
     * bind event
     * @param {String} events
     * @param {Function} handler
     * @returns {EventEmitter} this
     */
    on: function(events, handler) {
        if (events === undefined || handler === undefined) {
            return;
        }

        var handlers = this.handlers;
        each(splitStr(events), function(event) {
            handlers[event] = handlers[event] || [];
            if (inArray(handlers[event], handler) < 0) {
                handlers[event].push(handler);
            }
        });
        return this;
    },

    /**
     * unbind event, leave emit blank to remove all handlers
     * @param {String} events
     * @param {Function} [handler]
     * @returns {EventEmitter} this
     */
    off: function(events, handler) {
        if (events === undefined) {
            return;
        }

        var handlers = this.handlers;
        each(splitStr(events), function(event) {
            if (!handler) {
                delete handlers[event];
            } else if (handlers[event]) {
                var index = inArray(handlers[event], handler);
                if (index > -1) {
                    handlers[event].splice(index, 1);
                    if (!handlers[event].length) {
                        delete handlers[event];
                    }
                }
            }
        });
        return this;
    },

    /**
     * emit event to the listeners
     * @param {String} event
     * @param {Object} data
     */
    emit: function(event, data) {
        var domEvents = this.options.domEvents;
        var handlers = this.handlers[event];
        if (!domEvents && (!handlers || !handlers.length)) {
            return;
        }

        data.type = event;
        if (!data.preventDefault) {
            data.preventDefault = function() {
                data.srcEvent.preventDefault();
            };
        }

        // we also want to trigger dom events
        if (domEvents) {
            triggerDomEvent(event, data);
            handlers = this.handlers[event];
            if (!handlers || !handlers.length) {
                return;
            }
        }

        handlers = handlers.slice();
        var i = 0;
        while (i < handlers.length) {
            handlers[i](data);
            i++;
        }
    },

    /**
     * destroy the manager and unbinds all events
     * it doesn't unbind dom events, that is the user own responsibility
     */
    destroy: function() {
        toggleCssProps(this, false);
        this.touchAction && this.touchAction.destroy();

        this.stop(true);
        each(this.recognizers, function(recognizer) {
            recognizer.reset();
        });
        this.handlers = {};
        this.session = {};
        this.input && this.input.destroy();
        this.input = null;
        this.element = null;
        this.options.inputTarget = null;
    }
};

/**
 * add/remove the css properties as defined in manager.options.cssProps
 * @param {Manager} manager
 * @param {Boolean} add
 */
function toggleCssProps(manager, add) {
    var element = manager.element;
    if (!element || !element.style) {
        return;
    }
    var prop;
    each(manager.options.cssProps, function(value, name) {
        prop = prefixed(element.style, name);
        if (prop) {
            if (add) {
                manager.oldCssProps[prop] = element.style[prop];
                element.style[prop] = value;
            } else {
                element.style[prop] = manager.oldCssProps[prop] || '';
            }
        }
    });
    if (!add) {
        manager.oldCssProps = {};
    }
}

/**
 * trigger dom event
 * @param {String} event
 * @param {Object} data
 */
function triggerDomEvent(event, data) {
    var gestureEvent;
    if (typeof Event === TYPE_FUNCTION) {
        gestureEvent = new Event(event, {
            bubbles: true,
            cancelable: true,
            composed: true
        });
    } else {
        gestureEvent = document.createEvent('Event');
        gestureEvent.initEvent(event, true, true);
    }
    gestureEvent.gesture = data;
    data.target.dispatchEvent(gestureEvent);
}
