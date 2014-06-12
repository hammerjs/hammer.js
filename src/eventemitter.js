/**
 * Event emitter
 * @constructor
 */
function EventEmitter(element, domEvents) {
    this.element = element;
    this.domEvents = domEvents;

    /**
     * contains handlers, grouped by event name
     * 'swipe': [Function, Function, ...],
     * 'hold': [Function, Function, ...]
     * @type {{}}
     */
    this.eventHandlers = {};
}

EventEmitter.prototype = {
    /**
     * bind event
     * @param {String} events
     * @param {Function} handler
     * @returns {EventEmitter} this
     */
    on: function(events, handler) {
        var store = this.eventHandlers;
        each(splitStr(events), function(event) {
            store[event] = store[event] || [];
            store[event].push(handler);
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
        var store = this.eventHandlers;
        each(splitStr(events), function(event) {
            if(!handler) {
                delete store[event];
            } else {
                store[event].splice(inArray(store[event], handler), 1);
            }
        });
        return this;
    },

    /**
     * removes all events handlers
     * it doesn't unbind dom events, that is the user own responsibility
     */
    destroy: function() {
        this.eventHandlers = {};
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
        var handlers = this.eventHandlers[event];
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
