(function($) {

    // Hammer Events override for better browser compatibility (IE<9)
    Hammer.event.bindDom = function(el, type, cb) { $(el).on(type, cb); };

    Hammer.event.on = function(obj, types, handler){
        if(obj instanceof Hammer.Instance) {
            obj = obj.element;
        }
        $(obj).bind(types, handler);
    };

    Hammer.event.off = function(obj, types, handler){
        if(obj instanceof Hammer.Instance) {
            obj = obj.element;
        }
        $(obj).unbind(types, handler);
    };

    Hammer.event.trigger = function(obj, event, data){
        if(obj instanceof Hammer.Instance) {
            obj = obj.element;
        }
        var ev = jQuery.Event(event, data);
        ev.type = event;
        $(obj).trigger(ev);
    };


    $.fn.hammer = function(config) {
        return this.each(function() {
            var el = $(this);
            if(!el.data("hammer")) {
                var inst = Hammer(this, config);
                el.data("hammer", inst);
            }
        });
    };

})(jQuery);
