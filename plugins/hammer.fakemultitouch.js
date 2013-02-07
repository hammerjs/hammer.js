(function(Hammer) {
    /**
     * enable multitouch on the desktop by pressing the shiftkey
     * the other touch goes in the opposite direction so the center keeps at its place
     * it's recommended to enable Hammer.debug.showTouches for this one
     */
    Hammer.plugins.fakeMultitouch = function() {
        // keeps the start position to keep it centered
        var start_pos = false;

        /**
         * overwrites Hammer.event.getTouchList.
         * @param   {Event}     ev
         * @param   TOUCHTYPE   type
         * @return  {Array}     Touches
         */
        Hammer.event.getTouchList = function(ev, eventType) {
            // Android, iOS etc
            if(Hammer.HAS_POINTEREVENTS) {
                return Hammer.PointerEvent.getPointers();
            }
            else if(Hammer.HAS_TOUCHEVENTS) {
                return ev.touches;
            }

            // reset on start of a new touch
            if(eventType == Hammer.EVENT_START) {
                start_pos = false;
            }

            // when the shift key is pressed, multitouch is possible on desktop
            // why shift? because ctrl and alt are taken by osx and linux
            if(ev.shiftKey) {
                // on touchstart we store the position of the mouse for multitouch
                if(!start_pos) {
                    start_pos = {
                        pageX: ev.pageX,
                        pageY: ev.pageY
                    };
                }

                var distance_x = start_pos.pageX - ev.pageX;
                var distance_y = start_pos.pageY - ev.pageY;

                // fake second touch in the opposite direction
                return [{
                    identifier: 1,
                    pageX: start_pos.pageX - distance_x - 50,
                    pageY: start_pos.pageY - distance_y - -50,
                    target: ev.target
                },{
                    identifier: 2,
                    pageX: start_pos.pageX + distance_x - -50,
                    pageY: start_pos.pageY + distance_y - 50,
                    target: ev.target
                }];
            } 
            // normal single touch
            else {
                start_pos = false;
                return [{
                    identifier: 1,
                    pageX: ev.pageX,
                    pageY: ev.pageY,
                    target: ev.target
                }];
            }
        };
    };

})(window.Hammer);