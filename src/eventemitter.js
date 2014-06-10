/**
 * Event emitter
 * @constructor
 */
function EventEmitter() {
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
     * unbinds all events
     */
    destroy: function() {
        this.eventHandlers = {};
    },

    /**
     * @param {String} event
     * @param {Object} [data]
     */
    emit : function(event, data) {
        var session = this.session;
        var handlers = this.eventHandlers[event];

        // if the event has no handlers, or the stopImmediate is called
        if(!handlers && (!session || !session.stopImmediate)) {
            return;
        }

        data = data || {};
        data.type = event;

        var srcEvent = data.srcEvent;
        if(srcEvent) {
            data.target = srcEvent.target;

            data.preventDefault = function() {
                srcEvent.preventDefault();
            };
            data.stopPropagation = function() {
                srcEvent.stopPropagation();
            };
            data.stopImmediatePropagation = function() {
                session.stopImmediate = true;
                srcEvent.stopImmediatePropagation();
            };
        }

        for(var i = 0; i < handlers.length; i++) {
            handlers[i](data);
        }
    }
};
