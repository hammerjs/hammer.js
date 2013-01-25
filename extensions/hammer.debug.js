(function(Hammer) {

    Hammer.debug = {};

    /**
     * ShowTouches gesture
     * requires jQuery
     * show all touch on the screen by placing elements at there pageX and pageY
     */
    Hammer.debug.showTouches = function() {
        // the circles under your fingers
        var template = '<div style="position:absolute;left:0;top:0;height:14px;width:14px;border:solid 2px #777;' +
            'background:rgba(255,255,255,.3);border-radius:20px;pointer-events:none;' +
            'margin-top:-9px;margin-left:-9px;"></div>';

        // elements by identifier
        var touch_elements = {};

        Hammer.gesture.registerGesture({
            priority: 0,
            handle: function(type, ev, inst) {
                // get touches by ID
                var touches_index = {};

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
                    touch_elements[id].css("transform", "translate3d("+touch.pageX+"px,"+touch.pageY+"px, 0)");
                }

                // remove unused touch elements
                for(var key in touch_elements) {
                    if(touch_elements.hasOwnProperty(key) && !touches_index[key]) {
                        touch_elements[key].remove();
                        delete touch_elements[key];
                    }
                }

            }
        });
    };


    /**
     * enable multitouch on the desktop by pressing the shiftkey
     * the other touch goes in the opposite direction so the center keeps at its place
     * it's recommended to enable Hammer.debug.showTouches for this one
     */
    Hammer.debug.fakeMultitouch = function() {
        // keeps the start position to keep it centered
        var start_pos = false;

        /**
         * overwrites Hammer.event.createFakeTouchList.
         * @param   TOUCHTYPE   type
         * @param   {Event}     ev
         * @return  {Array}     Touches
         */
        Hammer.event.createFakeTouchList = function(type, ev) {
            // this part is the same as in the original
            var touches = [{
                identifier: 1,
                clientX: ev.clientX,
                clientY: ev.clientY,
                pageX: ev.pageX,
                pageY: ev.pageY,
                target: ev.target
            }];

            // reset on start of a new touch
            if(type == Hammer.TOUCH_START) {
                start_pos = false;
            }

            // when the shift key is pressed, multitouch is possible on desktop
            // why shift? because ctrl and alt are taken by osx and linux
            if(ev.shiftKey) {
                // on touchstart we store the position of the mouse for multitouch
                if(!start_pos) {
                    start_pos = {
                        pageX: ev.pageX,
                        pageY: ev.pageY,
                        clientX: ev.clientX,
                        clientY: ev.clientY
                    };
                }

                // small misplacement to fix NaN/Infinity issues
                var distance_x = start_pos.pageX - ev.pageX - 5;
                var distance_y = start_pos.pageY - ev.pageY - -5;

                // fake second touch in the opposite direction
                touches.push({
                    identifier: 2,
                    clientX: start_pos.clientX + distance_x,
                    clientY: start_pos.clientY + distance_y,
                    pageX: start_pos.pageX + distance_x,
                    pageY: start_pos.pageY + distance_y,
                    target: ev.target
                });
            // normal single touch
            } else {
                start_pos = false;
            }

            return touches;
        };
    };

})(window.Hammer);