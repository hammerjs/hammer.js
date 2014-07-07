(function($, Hammer, dataAttr) {
    function hammerify(el, options) {
        var $el = $(el);
        if(!$el.data(dataAttr)) {
            $el.data(dataAttr, new Hammer($el[0], options));
        }
    }

    $.fn.hammer = function(options) {
        return this.each(function() {
            hammerify(this, options);
        });
    };

    // extend the emit method to also trigger jQuery events
    Hammer.Manager.prototype.emit = (function(originalEmit) {
        return function(type, data) {
            originalEmit.call(this, type, data);
            jQuery(this.element).triggerHandler({
                type: type,
                gesture: data
            });
        };
    })(Hammer.Manager.prototype.emit);
})(jQuery, Hammer, "hammer");
