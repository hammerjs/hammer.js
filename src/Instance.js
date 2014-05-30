Hammer.defaults = {
    touchAction: 'pan-y',
    domEvents: false
};

/**
 * Hammer instance for an element
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Instance(element, options) {
    this.element = element;
    this.options = merge(options || {}, Hammer.defaults);

    this.eventHandlers = {};

    Manager.apply(this, arguments);
}

inherit(Instance, Manager, {
    /**
     * bind event
     * @param {String} event
     * @param {Function} handler
     * @returns {Instance}
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
     * unbind event, leave handler blank to remove all handlers
     * @param {String} event
     * @param {Function} [handler]
     * @returns {Instance}
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
     * destroy the instance
     * unbinds all events
     */
    destroy: function() {
        each(this.eventHandlers, function(handlers, event) {
            this.off(event);
        }, this);

        this.eventHandlers = [];
        this.session = {};
        this.input.destroy();
        this.element = null;
    },

    /**
     * @param {String} event
     * @param {Object} data
     */
    trigger : function(event, data) {
        data.type = event;

        data.preventDefault = data.srcEvent.preventDefault;
        data.stopPropagation = data.srcEvent.stopPropagation;
        data.stopImmediatePropagation = data.srcEvent.stopImmediatePropagation;
        data.target = data.srcEvent.target;

        each(this.eventHandlers[event] || [], function(handler) {
            handler.call(this, data);
        }, this);
    }
});
