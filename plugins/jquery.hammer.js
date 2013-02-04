(function($) {
    /**
     * bind dom events
     * this overwrites addEventListener
     * @param elements
     * @param types
     * @param handler
     */
    Hammer.event.bindDom = function(element, eventTypes, handler) {
        $(element).on(eventTypes, function(ev) {
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
     * create instance of Hammer and watch for gestures,
     * and when called again you can change the options
     * @param   object      [options={}]
     * @return  jQuery
     */
    $.fn.hammer = function(options) {
        return this.each(function() {
            var el = $(this);
            var inst = el.data("hammer");
            // start new hammer instance
            if(!inst) {
                el.data("hammer", Hammer(this, options || {}));
            }
            // change the options
            else if(inst && options) {
                Hammer.utils.extend(inst.options, options);
            }
        });
    };

})(jQuery);
