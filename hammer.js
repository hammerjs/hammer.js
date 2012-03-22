/*
 * Hammer.JS
 * version 0.01
 */
function Hammer(element, options)
{
    var self = this;

    var defaults = {
        // prevent the default event or not... might be buggy when false
        prevent_default    : false,

        drag               : true,
        drag_vertical      : true,
        drag_horizontal    : true,
        // minimum distance before the drag event starts
        drag_min_distance  : 20, // pixels

        // pinch zoom and rotation
        transform          : true,
        scale_treshold     : 0.1,
        rotation_treshold  : 15, // degrees

        tap                : true,
        tap_double         : true,
        tap_max_interval   : 300,
        tap_double_distance: 20,

        hold               : true,
        hold_timeout       : 500
    };
    options = $.extend({}, defaults, options);

    // make sure element in a jQuery object
    element = $(element);

    // some css hacks
    $(['-webkit-','-moz-','-ms-','-o-','']).each(function(i, vendor) {
        var css = {};
        var props = {
            "user-select": "none",
            "touch-callout": "none",
            "user-drag": "none",
            "tap-highlight-color": "rgba(0,0,0,0)"
        };

        for(var prop in props) {
            css[vendor + prop] = props[prop];
        }

        element.css(css);
    });

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
    var _prev_tap_pos = {x: 0, y: 0};
    var _prev_tap_end_time = null;

    var _hold_timer = null;

    var _offset = {};

    // keep track of the mouse status
    var _mousedown = false;


    /**
     * angle to direction define
     * @param  float    angle
     * @return string   direction
     */
    this.getDirectionFromAngle = function( angle )
    {
        var directions = {
            down: angle >= 45 && angle < 135, //90
            left: angle >= 135 || angle <= -135, //180
            up: angle < -45 && angle > -135, //270
            right: angle >= -45 && angle <= 45 //0
        };

        var direction;
        $.each(directions, function(key, value){
            if(value){
                direction = key;
                return false;
            }
        });
        return direction;
    };


    /**
     * count the number of fingers in the event
     * when no fingers are detected, one finger is returned (mouse pointer)
     * @param  jQueryEvent
     * @return int  fingers
     */
    function countFingers( event )
    {
        // there is a bug on android (until v4?) that touches is always 1,
        // so no multitouch is supported, e.g. no, zoom and rotation...
        return event.originalEvent.touches ? event.originalEvent.touches.length : 1;
    }


    /**
     * get the x and y positions from the event object
     * @param  jQueryEvent
     * @return array  [{ x: int, y: int }]
     */
    function getXYfromEvent( event )
    {
        // no touches, use the event pageX and pageY
        if(!event.originalEvent.touches) {
            return [{ x: event.pageX, y: event.pageY }];
        }
        // multitouch, return array with positions
        else {
            var pos = [], src;
            for(var t=0, len=event.originalEvent.touches.length; t<len; t++) {
                src = event.originalEvent.touches[t];
                pos.push({ x: src.pageX, y: src.pageY });
            }
            return pos;
        }
    }


    /**
     * calculate the angle between two points
     * @param object pos1 { x: int, y: int }
     * @param object pos2 { x: int, y: int }
     */
    function getAngle( pos1, pos2 )
    {
          return Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x) * 180 / Math.PI;
    }

    /**
     * trigger an event/callback by name with params
     * @param string name
     * @param array  params
     */
    function triggerEvent( eventName, params )
    {
        // return touches object
        params.touches = getXYfromEvent(params.originalEvent);

        // trigger jQuery event
        element.trigger($.Event(eventName, params));

        // trigger callback
        if($.isFunction(self["on"+ eventName])) {
            self["on"+ eventName].call(self, params);
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


    var gestures = {
        // hold gesture
        // fired on touchstart
        hold : function(event)
        {
            // only when one finger is on the screen
            if(options.hold && _fingers == 1) {
                _gesture = 'hold';
                clearTimeout(_hold_timer);

                _hold_timer = setTimeout(function() {
                    if(_gesture == 'hold' && _fingers == 1) {
                        triggerEvent("hold", {
                            originalEvent   : event,
                            position        : _pos.start
                        });
                    }
                }, options.hold_timeout);
            }
        },


        // drag gesture
        // fired on mousemove
        drag : function(event)
        {
            // get the distance we moved
            var _distance_x = Math.abs(_pos.move[0].x - _pos.start[0].x);
            var _distance_y = Math.abs(_pos.move[0].y - _pos.start[0].y);
            _distance = Math.max(_distance_x, _distance_y);

            // drag
            // minimal movement required
            if(options.drag && (_distance > options.drag_min_distance) || _gesture == 'drag') {
                // calculate the angle
                _angle = getAngle(_pos.start[0], _pos.move[0]);
                _direction = self.getDirectionFromAngle(_angle);

                // check the movement and stop if we go in the wrong direction
                var is_vertical = (_direction == 'up' || _direction == 'down');
                if(((is_vertical && !options.drag_vertical) || (!is_vertical && !options.drag_horizontal))
                        && (_distance > options.drag_min_distance)) {
                    return;
                }

                _gesture = 'drag';

                var position = { x: _pos.move[0].x - _offset.left,
                                 y: _pos.move[0].y - _offset.top };

                var event_obj = {
                    originalEvent   : event,
                    position        : position,
                    direction       : _direction,
                    distance        : _distance,
                    angle           : _angle
                };

                // on the first time trigger the start event
                if(_first) {
                    triggerEvent("dragstart", event_obj);

                    _first = false;
                }

                // normal slide event
                triggerEvent("drag", event_obj);

                event.preventDefault();
            }
        },


        // transform gesture
        // fired on touchmove
        transform : function(event)
        {
            if(options.transform) {
                var scale = event.originalEvent.scale || 1;
                var rotation = event.originalEvent.rotation || 0;

                if(_gesture != 'drag' &&
                    (_gesture == 'transform' || Math.abs(1-scale) > options.scale_treshold
                        || Math.abs(rotation) > options.rotation_treshold)) {
                    _gesture = 'transform';

                    _pos.center = {  x: ((_pos.move[0].x + _pos.move[1].x) / 2) - _offset.left,
                                     y: ((_pos.move[0].y + _pos.move[1].y) / 2) - _offset.top };

                    var event_obj = {
                        originalEvent   : event,
                        position        : _pos.center,
                        scale           : scale,
                        rotation        : rotation
                    };

                    // on the first time trigger the start event
                    if(_first) {
                        triggerEvent("transformstart", event_obj);
                        _first = false;
                    }

                    triggerEvent("transform", event_obj);

                    event.preventDefault();

                    return true;
                }
            }

            return false;
        },


        // tap and double tap gesture
        // fired on touchend
        tap : function(event)
        {
            // compare the kind of gesture by time
            var now = new Date().getTime();
            var touch_time = now - _touch_start_time;
            var is_double_tap = function () {
                if (_prev_tap_pos && options.tap_double && _prev_gesture == 'tap' &&
                                (_touch_start_time - _prev_tap_end_time) < options.tap_max_interval) {
                    var x_distance = Math.abs(_prev_tap_pos[0].x - _pos.start[0].x);
                    var y_distance = Math.abs(_prev_tap_pos[0].y - _pos.start[0].y);
                    return (_prev_tap_pos && _pos.start &&
                        Math.max(x_distance, y_distance) < options.tap_double_distance);
                }
                return false;
            }

            // dont fire when hold is fired
            if(options.hold && !(options.hold && options.hold_timeout > touch_time)) {
                return;
            }

            // when previous event was tap and the tap was max_interval ms ago

            if(is_double_tap()) {
                _gesture = 'double_tap';
                _prev_tap_end_time = null;

                triggerEvent("doubletap", {
                    originalEvent   : event,
                    position        : _pos.start
                });
                event.preventDefault();
            }

            // single tap is single touch
            else {
                _gesture = 'tap';
                _prev_tap_end_time = now;
                _prev_tap_pos = _pos.start;

                if(options.tap) {
                    triggerEvent("tap", {
                        originalEvent   : event,
                        position        : _pos.start
                    });
                    event.preventDefault();
                }
            }

        }

    };


    function handleEvents(event)
    {
        switch(event.type)
        {
            case 'mousedown':
            case 'touchstart':
                _pos.start = getXYfromEvent(event);
                _touch_start_time = new Date().getTime();
                _fingers = countFingers(event);
                _first = true;
                _offset = element.offset();

                _mousedown = true;

                // hold gesture
                gestures.hold(event);

                if(options.prevent_default) {
                    event.preventDefault();
                }
                break;

            case 'mousemove':
            case 'touchmove':
                if(!_mousedown) {
                    return false;
                }
                _pos.move = getXYfromEvent(event);

                if(!gestures.transform(event)) {
                    gestures.drag(event);
                }
                break;

            case 'mouseup':
            case 'touchcancel':
            case 'touchend':
                _mousedown = false;

                // drag gesture
                // dragstart is triggered, so dragend is possible
                if(_gesture == 'drag') {
                    triggerEvent("dragend", {
                        originalEvent   : event,
                        direction       : _direction,
                        distance        : _distance,
                        angle           : _angle
                    });
                }

                // transform
                // transformstart is triggered, so transformed is possible
                else if(_gesture == 'transform') {
                    triggerEvent("transformend", {
                        originalEvent   : event,
                        position        : _pos.center,
                        scale           : event.originalEvent.scale,
                        rotation        : event.originalEvent.rotation
                    });
                }
                else {
                    gestures.tap(event);
                }

                _prev_gesture = _gesture;

                // reset vars
                reset();
                break;
        }
    }

    // bind events for touch devices
    // except for windows phone 7.5, it doenst support touch events..!
    if('ontouchstart' in window) {
        element.bind("touchstart touchmove touchend touchcancel", handleEvents);
    }
    // for non-touch
    else {
        // Listen for mouseup on the document so we know it happens
        // even if the mouse has left the element.
        $(document).bind("mouseup", handleEvents);
        element.bind("mousedown mousemove", handleEvents);
    }
}