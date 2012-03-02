function Hammer(element, options)
{
    var self = this;

    var defaults = {
        drag: true,
        drag_vertical: false,
        drag_horizontal: true,
        drag_min_distance: 20,
        drag_threshold: 70,		// how much the sliding can be out of the exact direction

        transform: true,    // pinch zoom and rotation

        tap: true,
        tap_double: true,
        tap_max_interval: 500,

        hold: true,
        hold_timeout: 500
    };
    options = $.extend({}, defaults, options);


    // make sure element in a jQuery object
    element = $(element);

    // some css hacks
    element.css({
        "-webkit-user-select": "none",
        "-webkit-touch-callout": "none",
        "-webkit-text-size-adjust": "none",
        "-webkit-tap-highlight-color": "rgba(0, 0, 0, 0)"
    });


    // directions defines
    this.DIRECTION = {
        UP: 360,
        DOWN: 0,
        LEFT: -180,
        RIGHT: 180 };


    // holds the distance that has been moved
    var _distance = 0;

    // holds the exact angle that has been moved
    var _angle = 0;

    // holds the diraction that has been moved
    var _direction = 0;

    // holds position movement for sliding
    var _pos = { };

    // how many fingers are on the screen
    var _fingers = 0;

    var _first = false;

    var _gesture = null;
    var _prev_gesture = null;

    var _touch_start_time = null;
    var _prev_tap_end_time = null;

    var _hold_timer = null;

    var _offset = {};


    /**
     * angle to direction define
     * @param	float	angle
     * @return	int		DIRECTION
     */
    this.getDirectionFromAngle = function( angle )
    {
        for(var name in this.DIRECTION) {
            var min = this.DIRECTION[name] - options.drag_threshold;
            var max = this.DIRECTION[name] + options.drag_threshold;

            // when we move up we also need to test the absolute number of the angle
            // because it also can be a negative number
            if(name == 'UP') {
                if(min < Math.abs(angle) && max > Math.abs(angle)) {
                    return this.DIRECTION[name];
                }
            }

            // just check if it is betweet the angles
            if(min < angle && max > angle) {
                return this.DIRECTION[name];
            }
        }
    };


    /**
     * get the percent of movement of the height/width of the container
     * @param	float	distance
     * @param	int		DIRECTION
     * @return	float	percent
     */
    this.distanceToPercentage = function( distance, direction )
    {
        var dim = self.directionIsVertical(direction) ? element.height() : element.width();
        return (100/dim) * distance;
    };


    /**
     * count the number of fingers in the event
     * when no fingers are detected, one finger is returned (mouse pointer)
     * @param 	jQueryEvent
     * @return	int		fingers
     */
    function countFingers( event )
    {
        // there is a bug on android (until v4?) that touches is always 1,
        // so no multitouch is supported, e.g. no, zoom and rotation...
        return event.originalEvent.touches ? event.originalEvent.touches.length : 1;
    }


    /**
     * get the x and y position from the event object
     * @param 	jQueryEvent
     * @return	mixed		object with x and y or array with objects
     */
    function getXYfromEvent( event )
    {
        var src;
        // single touch
        if(countFingers(event) == 1) {
            src = event.originalEvent.touches ? event.originalEvent.touches[0] : event;
            return { x: src.pageX, y: src.pageY };
        }
        // multitouch, return array with positions
        else {
            var pos = [];
            for(var t=0; t<event.originalEvent.touches.length; t++) {
                src = event.originalEvent.touches[t];
                pos.push({ x: src.pageX, y: src.pageY });
            }
            return pos;
        }
    }


    /**
     * calculate the angle between two points
     * @param	object	pos1	{ x: int, y: int }
     * @param	object	pos2	{ x: int, y: int }
     */
    function getAngle( pos1, pos2 )
    {
        return Math.atan2(pos2.x - pos1.x, pos2.y - pos1.y) * 360 / Math.PI;
    }


    /**
     * trigger an event/callback by name with params
     * @param 	string	name
     * @param	array	params
     */
    function triggerEvent( eventName, params )
    {
        if($.isFunction(self[eventName])) {
            self[eventName].apply(self, params);
        }
    }


    /**
     * reset the internal vars to the start values
     */
    function reset()
    {
        _pos = {};
        _first = false;
        _fingers = 0;
        _distance = 0;
        _angle = 0;
        _gesture = null;
    }


    function handleEvents(ev)
    {
        switch(ev.type)
        {
            case 'mousedown':
            case 'touchstart':
                _pos.start = getXYfromEvent(ev);
                _touch_start_time = new Date().getTime();
                _fingers = countFingers(ev);
                _first = true;
                _offset = element.offset();

                // hold gesture
                if(options.hold && _fingers == 1) {
                    _gesture = 'hold';
                    clearTimeout(_hold_timer);
                    _hold_timer = setTimeout(function() {
                        if(_gesture == 'hold' && _fingers == 1) {
                            triggerEvent("onHold");
                        }
                    }, options.hold_timeout);
                }
                break;

            case 'mousemove':
            case 'touchmove':
                _pos.move = getXYfromEvent(ev);

                switch(_fingers) {
                    case 1:
                        // get the distance we moved
                        _distance = Math.max(Math.abs(_pos.move.x - _pos.start.x), Math.abs(_pos.move.y - _pos.start.y));

                        // drag
                        // minimal movement required
                        if(options.drag && (_distance > options.drag_min_distance) || _gesture == 'drag') {
                            _gesture = 'drag';

                            // calculate the angle
                            _angle = getAngle(_pos.start, _pos.move);
                            _direction = self.getDirectionFromAngle(_angle);

                            // check the movement and stop if we go in the wrong direction
                            var is_vertical = (self.DIRECTION.UP == _direction || self.DIRECTION.DOWN == _direction);
                            if((is_vertical && !options.drag_vertical) || (!is_vertical && !options.drag_horizontal)) {
                                reset();
                                return;
                            }

                            // stop the default event (for touchmove mostly)
                            ev.preventDefault();

                            var position = { x: _pos.move.x - _offset.left,
                                             y: _pos.move.y - _offset.top };


                            // on the first time trigger the start event
                            if(_first) {
                                triggerEvent("onDragStart", [ position, _direction, _distance, _angle ]);
                                _first = false;
                            }

                            // normal slide event
                            triggerEvent("onDrag", [ position, _direction, _distance, _angle ]);
                        }
                        break;

                    // two fingers
                    case 2:
                        if(options.transform) {
                            _gesture = 'transform';

                            var scale = ev.originalEvent.scale;
                            var rotation = ev.originalEvent.rotation;

                            if(scale || rotation) {
                                var center = {  x: ((_pos.move[0].x + _pos.move[1].x) / 2) - _offset.left,
                                    y: ((_pos.move[0].y + _pos.move[1].y) / 2) - _offset.top };

                                // on the first time trigger the start event
                                if(_first) {
                                    triggerEvent("onTransformStart", [ center, scale, rotation ]);
                                    _first = false;
                                }

                                triggerEvent("onTransform", [ center, scale, rotation ]);
                            }
                            ev.preventDefault();
                        }
                        break;
                }
                break;

            case 'mouseup':
            case 'touchend':
                // drag
                if(_gesture == 'drag') {
                    triggerEvent("onDragEnd", [ _direction, _distance, _angle ]);
                }
                else {
                    // compare the kind of gesture by time
                    var now = new Date().getTime();
                    var touch_time = now - _touch_start_time;

                    // dont fire when hold is fired
                    if(!options.hold || (options.hold && options.hold_timeout > touch_time)) {
                        // when previous event was tap and the tap was max_interval ms ago
                        if(options.tap_double && _prev_gesture == 'tap' && (_touch_start_time - _prev_tap_end_time) < options.tap_max_interval) {
                            _gesture = 'double_tap';
                            _prev_tap_end_time = null;

                            triggerEvent("onDoubleTap");
                            ev.preventDefault();
                        }
                        // single tap is single touch
                        else {
                            _gesture = 'tap';
                            _prev_tap_end_time = now;

                            if(options.tap) {
                                triggerEvent("onTap");
                                ev.preventDefault();
                            }
                        }
                    }
                }

                _prev_gesture = _gesture;

                // reset vars
                reset();
                break;
        }
    }


    // bind events for touch devices
    if('ontouchstart' in window) {
        $(element).bind("touchstart touchmove touchend", handleEvents);
    // for non-touch
    } else {
        // mouseup on the document because the mouse can be out of the element when this is fired
        // or else it is never fired...!
        $(document).bind("mouseup", handleEvents);
        $(element).bind("mousedown mousemove", handleEvents);
    }
}