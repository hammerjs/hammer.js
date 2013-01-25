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
            'background:rgba(255,255,255,.8);border-radius:20px;pointer-events:none;' +
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

                    touch_elements[id].css("transform", "translate3d("+touch.pageX+"px,"+touch.pageY+"px, 0)");
                }

                // remove unused touch elements
                for(var id in touch_elements) {
                    if(!touches_index[id]) {
                        touch_elements[id].remove();
                        delete touch_elements[id];
                    }
                }

            }
        });
    };


    /**
     * enable multitouch on the desktop by pressing the shiftkey
     * the other touch goes in the opposite direction so the center keeps at its place
     * it's recommended to enable Hammer.debug.showTouches for this one
     *
     * @param   TOUCHTYPE   type
     * @param   {Event}     ev
     * @return  {Array}     Touches
     */
    Hammer.event.createFakeTouchList = function(type, ev) {
        var touches = [{
            identifier: 1,
            clientX: ev.clientX,
            clientY: ev.clientY,
            pageX: ev.pageX,
            pageY: ev.pageY,
            target: ev.target
        }];

        // on touchstart we store the position of the mouse for multitouch
        if(type == Hammer.TOUCH_START) {
            Hammer.event._first_mouse_pos = {
                identifier: 2,
                clientX: ev.clientX+50,
                clientY: ev.clientY+50,
                pageX: ev.pageX+50,
                pageY: ev.pageY+50,
                target: ev.target
            };
        }

        // @todo make this go in scale with the real mouse position
        // when the shift key is pressed, multitouch is possible on desktop
        if(ev.shiftKey) {
            touches.push(Hammer.event._first_mouse_pos);
        }

        return touches;
    };

})(window.Hammer);