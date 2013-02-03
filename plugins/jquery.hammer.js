(function($) {
    /**
     * bind dom events
     * this overwrites addEventListener
     * @param el
     * @param types
     * @param handler
     */
    Hammer.event.bindDom = function(el, types, handler) {
        $(el).on(types, function(ev) {
            handler.call(this, ev.originalEvent);
        });
    };

    /**
     * the methods are called by the instance, but with the jquery plugin
     * we use the jquery event methods instead.
     * @this Hammer.Instance
     */
    Hammer.Instance.prototype.on = function(types, handler) {
        $(this.element).on(types, handler);
    };
    Hammer.Instance.prototype.off = function(types, handler) {
        $(this.element).off(types, handler);
    };


    /**
     * trigger events
     * this is called by the gestures to trigger an event like 'tap'
     * @this Hammer.Instance
     * @param gesture
     * @param data
     */
    Hammer.Instance.prototype.trigger = function(gesture, eventData){
        $(eventData.srcEvent.target).trigger({
            type: gesture,
            gesture: eventData
        });
    };


    /**
     * jQuery plugin
     * @param   object  config
     * @return  jQuery
     */
    $.fn.hammer = function(config) {
        return this.each(function() {
            var el = $(this);
            if(!el.data("hammer")) {
                var inst = Hammer(this, config || {});
                el.data("hammer", inst);
            }
        });
    };

})(jQuery);
