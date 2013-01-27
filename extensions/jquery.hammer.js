(function($) {

    // Hammer Events override for better browser compatibility (IE<9)
    Hammer.event.bindDom = function(el, type, cb) {
        $(el).on(type, cb);
    };

})(jQuery);
