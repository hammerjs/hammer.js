/*
 * special event API with Hammer.JS
 * version 0.9
 * author: Damien Antipa
 * https://github.com/dantipa/hammer.js
 */
(function ($) {
    var hammerEvents = ['hold','tap','doubletap','transformstart','transform','transformend','dragstart','drag','dragend','swipe','release'];

    $.each(hammerEvents, function(i, event) {

        $.event.special[event] = {

            setup: function(data, namespaces, eventHandle) {
                var $target = $(this),
                    hammer;

                if (!$target.hammer) {
                    $target.data('hammerjs', new Hammer(this, data));
                }

                hammer = $target.data('hammerjs');

                hammer['on'+ event] = function (ev) {
                    $target.trigger($.Event(event, ev));
                };
            },

            teardown: function(namespaces) {
                var $target = $(this),
                    hammer = $target.data('hammerjs');

                if(hammer && hammer['on'+ event]) {
                    delete hammer['on'+ event];
                }
            }
        };
    });
}(jQuery));