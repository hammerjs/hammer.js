/*! faketouches.js - v0.0.1 - 2013-02-25
 * Copyright (c) 2013 Jorik Tangelder <j.tangelder@gmail.com>;
 * Licensed under the MIT license */

(function(window) {
	'use strict';


    /**
     * create faketouches instance
     * @param element
     * @constructor
     */
	function FakeTouches(element) {
		this.element = element;

		this.touches = [];
        this.touch_type = FakeTouches.TOUCH_EVENTS;
        this.has_multitouch = true;
	}

    FakeTouches.POINTER_TOUCH_EVENTS = 100;
    FakeTouches.POINTER_MOUSE_EVENTS = 200;
    FakeTouches.TOUCH_EVENTS = 300;
    FakeTouches.MOUSE_EVENTS = 400;
    FakeTouches.TOUCH_AND_MOUSE_EVENTS = 500;

    FakeTouches.POINTER_TYPE_MOUSE = 100;
    FakeTouches.POINTER_TYPE_TOUCH = 200;


    /**
     * set the kind of touchevents we want to trigger
     * @param   {Number}    touch_type
     */
    FakeTouches.prototype.setTouchType = function(touch_type) {
        this.touch_type = touch_type;

        this.has_multitouch = true;
        if(touch_type == FakeTouches.POINTER_MOUSE_EVENTS ||
            touch_type == FakeTouches.MOUSE_EVENTS) {
            this.has_multitouch = false;
        }
    };


    /**
     * uppercase first char
     * @param str
     * @returns {string}
     */
    function ucfirst(str) {
        str += '';
        var f = str.charAt(0).toUpperCase();
        return f + str.substr(1);
    }


	/**
	 * insert touches by xy per touch
	 * [ [x,y], [x,y] ]
	 * @param {Array} touches
	 */
	FakeTouches.prototype.setTouches = function(touches) {
		return this.touches = touches;
	};


	/**
	 * simple methods to just trigger an event
	 */
	['start','end','move','cancel'].forEach(function(val) {
		FakeTouches.prototype['trigger'+ ucfirst(val)] = (function(type) {
			return function(touches) {
                if(touches) {
                    this.touches = touches;
                }
				this.triggerEvent(type);
			};
		})(val);
	});


	/**
	 * move touches to new positions. all with x ammount, or per touch
	 * @param  {Mixed}	dx		When dx is an array, each touch can be updated
	 * @param  {Number} [dy]
	 */
	FakeTouches.prototype.moveBy = function(dx, dy) {
		var self = this;
		// each touch must be updated
		if(typeof dx == 'object') {
			var delta_touches = dx;
			this.touches.forEach(function(val, i) {
				self.touches[i][0] += delta_touches[i][0];
				self.touches[i][1] += delta_touches[i][1];
			});
		}
		// add dx,dy to all touches
		else {
			this.touches.forEach(function(val, i) {
				self.touches[i][0] += dx;
				self.touches[i][1] += dy;
			});
		}

		this.triggerMove();

		return this.touches;
	};


	FakeTouches.prototype.createTouchList = function(touches) {
		var touchlist = [];
		touches.forEach(function(val, index) {
			touchlist.push({
				pageX: val[0],
				pageY: val[1],
				clientX: val[0],
				clientY: val[1],
				identifier: index
			});
		});
		return touchlist;
	};



	FakeTouches.prototype.triggerEvent = function(type) {
        switch(this.touch_type) {
            case FakeTouches.TOUCH_EVENTS:
                triggerTouch.call(this, type);
                break;

            case FakeTouches.MOUSE_EVENTS:
                triggerMouse.call(this, type);
                break;

            case FakeTouches.TOUCH_AND_MOUSE_EVENTS:
                triggerTouch.call(this, type);
                triggerMouse.call(this, type);
                break;

            case FakeTouches.POINTER_TOUCH_EVENTS:
                triggerPointerEvents.call(this, type, FakeTouches.POINTER_TYPE_TOUCH);
                break;

            case FakeTouches.POINTER_MOUSE_EVENTS:
                triggerPointerEvents.call(this, type, FakeTouches.POINTER_TYPE_MOUSE);
                break;
        }
	};


    /**
     * trigger touch event
     * @param type
     * @returns {Boolean}
     */
    function triggerTouch(type) {
        var event = document.createEvent('Event');
        event.initEvent('touch'+ type, true, true);
        event.touches = this.createTouchList(this.touches);
        return this.element.dispatchEvent(event);
    }


    /**
     * trigger mouse event
     * @param type
     * @returns {Boolean}
     */
    function triggerMouse(type) {
        var names = {
            start: 'mousedown',
            move: 'mousemove',
            end: 'mouseup'
        };

        var event = document.createEvent('Event');
        event.initEvent(names[type], true, true);
        var touchList = this.createTouchList(this.touches);
        event.pageX = touchList[0].pageX;
        event.pageY = touchList[0].pageY;
        event.clientX = touchList[0].clientX;
        event.clientY = touchList[0].clientY;
        event.target = this.element;
        event.which = 1;
        return this.element.dispatchEvent(event);
    }

    /**
     * trigger pointer event
     * @param type
     * @param pointerType
     * @returns {Boolean}
     */
    function triggerPointerEvents(type, pointerType) {
        var self = this;
        var names = {
            start: 'MSPointerDown',
            move: 'MSPointerMove',
            end: 'MSPointerUp'
        };

        var touchList = this.createTouchList(this.touches);
        touchList.forEach(function(touch) {
            var event = document.createEvent('Event');
            event.initEvent(names[type], true, true);

            event.MSPOINTER_TYPE_MOUSE = FakeTouches.POINTER_TYPE_MOUSE;
            event.MSPOINTER_TYPE_TOUCH = FakeTouches.POINTER_TYPE_TOUCH;

            event.pointerId = touch.identifier;
            event.pointerType = pointerType;
            event.pageX = touch.pageX;
            event.pageY = touch.pageY;
            event.clientX = touch.clientX;
            event.clientY = touch.clientY;
            event.target = self.element;

            if(pointerType === FakeTouches.POINTER_TYPE_MOUSE) {
                event.which = 1;
            }

            self.element.dispatchEvent(event);
        });

        return true;
    }


	window.FakeTouches = FakeTouches;
})(window);

(function(FakeTouches) {
    'use strict';

    var Gestures = {};

    Gestures.Tap = function(callback) {
        this.setTouches([[100,100]]);
        this.triggerStart();
        this.triggerEnd();
        if(callback) {
            callback();
        }
    };

    Gestures.DoubleTap = function(callback) {
        var self = this;
        self.setTouches([[100,100]]);
        self.triggerStart();
        self.triggerEnd();

        setTimeout(function() {
            self.triggerStart();
            self.triggerEnd();

            if(callback) {
                callback();
            }
        }, 50);
    };

    Gestures.Hold = function(callback) {
        var self = this;
        this.setTouches([[100,100]]);
        this.triggerStart();

        setTimeout(function() {
            self.triggerEnd();
            if(callback) {
                callback();
            }
        }, 600);
    };

    Gestures.DragRight = function(callback) {
        var self = this;
        self.setTouches([[100,100]]);
        self.triggerStart();

        var moves=0;
        var interval = setInterval(function() {
            if(moves == 20) {
                self.triggerEnd();
                clearInterval(interval);
                if(callback) {
                    callback();
                }
                return;
            }
            self.moveBy(6,1);
            moves++;
        }, 30);
    };

    Gestures.SwipeRight = function(callback) {
        var self = this;
        self.setTouches([[100,100]]);
        self.triggerStart();

        var moves=0;
        var interval = setInterval(function() {
            if(moves == 20) {
                self.triggerEnd();
                clearInterval(interval);
                if(callback) {
                    callback();
                }
                return;
            }
            self.moveBy(3*moves,1);
            moves++;
        }, 15);
    };

    Gestures.PinchOut = function(callback) {
        var self = this;
        self.setTouches([[150,50],[50,150]]);
        self.triggerStart();

        var moves=0;
        var interval = setInterval(function() {
            if(moves == 20) {
                self.triggerEnd();
                clearInterval(interval);
                if(callback) {
                    callback();
                }
                return;
            }
            self.moveBy([[1,-1],[-1,1]]);
            moves++;
        }, 30);
    };

    Gestures.PinchIn = function(callback) {
        var self = this;
        self.setTouches([[150,50],[50,150]]);
        self.triggerStart();

        var moves=0;
        var interval = setInterval(function() {
            if(moves == 20) {
                self.triggerEnd();
                clearInterval(interval);
                if(callback) {
                    callback();
                }
                return;
            }
            self.moveBy([[-1,1],[1,-1]]);
            moves++;
        }, 30);
    };

    Gestures.Rotate = function(callback) {
        var self = this;
        var touches = self.setTouches([[50,50],[150,150]]);
        self.triggerStart();

        var center_x = 100;
        var center_y = 100;
        var rotation = 0;

        var interval = setInterval(function() {
            var rad = rotation * (Math.PI / 180);

            var new_pos = [];
            for(var t=0; t<touches.length; t++) {
                var x = touches[t][0];
                var y = touches[t][1];

                new_pos.push([
                    center_x + (x-center_x)*Math.cos(rad) - (y-center_y)*Math.sin(rad),
                    center_y + (x-center_x)*Math.sin(rad) + (y-center_y)*Math.cos(rad)
                ]);
            }

            self.triggerMove(new_pos);
            rotation += 2;
        }, 20);

        setTimeout(function() {
            clearInterval(interval);
            self.triggerEnd();
            if(callback) {
                callback();
            }
        }, 2000);
    };

    FakeTouches.prototype.triggerGesture = function(name, callback) {
        FakeTouches.Gestures[name].call(this, callback);
    };

    FakeTouches.Gestures = Gestures;
})(window.FakeTouches);