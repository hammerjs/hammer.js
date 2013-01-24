(function($) {

    // Hammer Events override for better browser compatibility (IE<9)
    Hammer.event.bind = function(el, type, cb) {
        $(el).on(type, cb);
    };

    Hammer.event.unbind = function(el, type, cb) {
        $(el).off(type, cb);
    };

    Hammer.event.trigger  = function(el, type, data) {
        var ev = $.Event(type, { originalEvent: data });
        $(el).trigger(ev);
    };

})(jQuery || Zepto);
