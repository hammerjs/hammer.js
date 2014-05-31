/**
 * Event emitter
 * @constructor
 */
function EventEmitter() {
    this.eventHandlers = {};
}

EventEmitter.prototype = {
    /**
     * bind event
     * @param {String} event
     * @param {Function} handler
     * @returns {EventEmitter}
     */
    on: function(event, handler) {
        var store = this.eventHandlers;
        var events = event.split(/\s+/);
        var ev;
        for(var i = 0; i < events.length; i++) {
            ev = events[i];
            if(ev) {
                store[ev] = store[ev] || [];
                store[ev].push(handler);
            }
        }
        return this;
    },

    /**
     * unbind event, leave emit blank to remove all handlers
     * @param {String} event
     * @param {Function} [handler]
     * @returns {EventEmitter}
     */
    off: function(event, handler) {
        var store = this.eventHandlers;
        var events = event.split(/\s+/);
        var ev;
        for(var i = 0; i < events.length; i++) {
            ev = events[i];
            if(store[ev]) {
                if(!handler) {
                    delete store[ev];
                } else {
                    store[ev].splice(inArray(store[ev], handler), 1);
                }
            }
        }
        return this;
    },

    /**
     * unbinds all events
     */
    destroy: function() {
        each(this.eventHandlers, function(handlers, event) {
            this.off(event);
        }, this);

        this.eventHandlers = [];
    },

    /**
     * @param {String} event
     * @param {Object} data
     */
    emit : function(event, data) {
        data.type = event;

        data.preventDefault = data.srcEvent.preventDefault;
        data.stopPropagation = data.srcEvent.stopPropagation;
        data.stopImmediatePropagation = data.srcEvent.stopImmediatePropagation;
        data.target = data.srcEvent.target;

        each(this.eventHandlers[event] || [], function(handler) {
            handler.call(this, data);
        }, this);
    }
};
