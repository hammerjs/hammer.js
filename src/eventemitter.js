/**
 * Event emitter
 * @constructor
 * @param {HTMLElement} element
 * @param {Boolean} domEvents trigger domEvents (which is slower than a regular function callback)
 */
function EventEmitter(element, domEvents) {
    this.element = element;
    this.domEvents = domEvents;

    /**
     * contains handlers, grouped by event name
     * 'swipe': [Function, Function, ...],
     * 'press': [Function, Function, ...]
     * @type {{}}
     */
    this.handlers = {};
}

EventEmitter.prototype = {
    /**
     * bind event
     * @param {String} events
     * @param {Function} handler
     * @returns {EventEmitter} this
     */
    on: function(events, handler) {
        var handlers = this.handlers;
        each(splitStr(events), function(event) {
            handlers[event] = handlers[event] || [];
            handlers[event].push(handler);
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
        var handlers = this.handlers;
        each(splitStr(events), function(event) {
            if(!handler) {
                delete handlers[event];
            } else {
                handlers[event].splice(inArray(handlers[event], handler), 1);
            }
        });
        return this;
    },

    /**
     * removes all events handlers
     * it doesn't unbind dom events, that is the user own responsibility
     */
    destroy: function() {
        this.handlers = {};
    },

    /**
     * emit event to the listeners
     * @param {String} event
     * @param {Object} data
     */
    emit : function(event, data) {
        // we also want to trigger dom events
        if(this.domEvents) {
            triggerDomEvent(event, data);
        }

        // no handlers, so skip it all
        var handlers = this.handlers[event];
        if(!handlers || !handlers.length) {
            return;
        }

        data.type = event;
        data.preventDefault = function() {
            data.srcEvent.preventDefault();
        };

        for(var i = 0; i < handlers.length; i++) {
            handlers[i](data);
        }
    }
};

/**
 * trigger dom event
 * @param {String} event
 * @param {Object} data
 */
function triggerDomEvent(event, data) {
    var gestureEvent = document.createEvent('Event');
    gestureEvent.initEvent(event, true, true);
    gestureEvent.gesture = data;
    data.target.dispatchEvent(gestureEvent);
}
