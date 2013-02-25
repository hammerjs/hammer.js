(function(Hammer) {
    /**
     * ShowTouches gesture
     * requires jQuery
     * show all touch on the screen by placing elements at there pageX and pageY
     * @param   {Boolean}   [force]
     */
    Hammer.plugins.showTouches = function(force) {
        // the circles under your fingers
        var template = '<div style="position:absolute;z-index:9999;left:0;top:0;height:14px;width:14px;border:solid 2px #777;' +
            'background:rgba(255,255,255,.7);border-radius:20px;pointer-events:none;' +
            'margin-top:-9px;margin-left:-9px;"></div>';

        // elements by identifier
        var touch_elements = {};
        var touches_index = {};

        /**
         * remove unused touch elements
         */
        function removeUnusedElements() {
            // remove unused touch elements
            for(var key in touch_elements) {
                if(touch_elements.hasOwnProperty(key) && !touches_index[key]) {
                    touch_elements[key].remove();
                    delete touch_elements[key];
                }
            }
        }

        Hammer.detection.register({
            name: 'show_touches',
            priority: 0,
            handler: function(ev, inst) {
                touches_index = {};

                // clear old elements when not using a mouse
                if(ev.pointerType != Hammer.POINTER_MOUSE && !force) {
                    removeUnusedElements();
                    return;
                }

                // place touches by index
                for(var t= 0,total_touches=ev.touches.length; t<total_touches;t++) {
                    var touch = ev.touches[t];

                    var id = touch.identifier;
                    touches_index[id] = touch;

                    // new touch element
                    if(!touch_elements[id]) {
                        touch_elements[id] = $(template).appendTo(document.body);
                    }

                    // Paul Irish says that translate is faster then left/top
                    touch_elements[id].css({
                        left: touch.pageX,
                        top: touch.pageY
                    });
                }

                removeUnusedElements();
            }
        });
    };
})(window.Hammer);