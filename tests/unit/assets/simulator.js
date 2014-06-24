var Simulator = (function() {
    // simple easing methods
    // found at the source of velocity.js
    var easings = {
        'linear': function(p) { return p; },
        'swing': function(p) { return 0.5 - Math.cos(p * Math.PI) / 2; },
        'quad': function(p) { return Math.pow(p, 2); },
        'cubic': function(p) { return Math.pow(p, 3); },
        'quart': function(p) { return Math.pow(p, 4); },
        'quint': function(p) { return Math.pow(p, 5); },
        'expo': function(p) { return Math.pow(p, 6); }
    };

    /**
     * merge objects
     */
    function merge(dest, src) {
        dest = dest || {};
        src = src || {};
        for (var key in src) {
            if (src.hasOwnProperty(key) && dest[key] === undefined) {
                dest[key] = src[key];
            }
        }
        return dest;
    }

    /**
     * generate a list of x/y around the center
     * @param center
     * @param countTouches
     * @param [radius=100]
     * @param [rotation=0]
     */
    function getTouches(center, countTouches, radius, rotation) {
        var cx = center[0],
            cy = center[1],
            touches = [],
            slice, i, angle;

        // just one touch, at the center
        if (countTouches === 1) {
            return [{ x: cx, y: cy }];
        }

        radius = radius || 100;
        rotation = (rotation * Math.PI / 180) || 0;
        slice = 2 * Math.PI / countTouches;

        for (i = 0; i < countTouches; i++) {
            angle = (slice * i) + rotation;
            touches.push({
                x: (cx + radius * Math.cos(angle)),
                y: (cy + radius * Math.sin(angle))
            });
        }

        return touches;
    }

    /**
     * create new TouchList like array
     * @returns {Array}
     * @constructor
     */
    function TouchList() {
        var touchList = [];
        touchList.identifiedTouch = touchList.item = function(index) {
            return this[index] || {};
        };
        return touchList;
    }

    /**
     * trigger a touchevent
     * @param touches
     * @param element
     * @param type
     */
    function triggerTouch(touches, element, type) {
        var touchList = TouchList();
        touches.forEach(function(touch, i) {
            var x = Math.round(touch.x),
                y = Math.round(touch.y);

            touchList.push({
                pageX: x,
                pageY: y,
                clientX: x,
                clientY: y,
                screenX: x,
                screenY: y,
                target: element,
                identifier: i
            });
        });

        var event = document.createEvent('Event');
        event.initEvent('touch' + type, true, true);
        event.touches = (type == 'end') ? TouchList() : touchList;
        event.targetTouches = (type == 'end') ? TouchList() : touchList;
        event.changedTouches = touchList;
        element.dispatchEvent(event);

        renderTouches(touchList);
    }

    function renderTouches(touchList) {
        touchList.forEach(function(touch) {
            var el = document.createElement('div');
            el.style.width = '20px';
            el.style.height = '20px';
            el.style.background = 'red';
            el.style.position = 'absolute';
            el.style.top = 0;
            el.style.left = 0;
            el.style.borderRadius = '100%';
            el.style.border = 'solid 2px #000';
            el.style.zIndex = 2000;

            el.style.transform = 'translate('+ touch.clientX +'px ,'+ touch.clientY +'px)';
            el.style.mozTransform = 'translate('+ touch.clientX +'px ,'+ touch.clientY +'px)';
            el.style.webkitTransform = 'translate('+ touch.clientX +'px ,'+ touch.clientY +'px)';

            document.body.appendChild(el);
            setTimeout(function() {
                document.body.removeChild(el);
                el = null;
            }, 100);
        });
    }

    /**
     * trigger a gesture
     * @param element
     * @param startTouches
     * @param options
     * @param done
     */
    function triggerGesture(element, startTouches, options, done) {
        var interval = 10,
            loops = Math.ceil(options.duration / interval),
            loop = 1;

        options = merge(options, {
            pos: [10, 10],
            duration: 250,
            touches: 1,
            deltaX: 0,
            deltaY: 0,
            radius: 100,
            scale: 1,
            rotation: 0,
            easing: 'swing'
        });


        function gestureLoop() {
            // calculate the radius
            // this is for scaling and multiple touches
            var radius = options.radius;
            if (options.scale !== 1) {
                radius = options.radius - (options.radius * (1 - options.scale) * (1 / loops * loop));
            }

            // calculate new position/rotation
            var easing = easings[options.easing](1 / loops * loop),
                posX = options.pos[0] + (options.deltaX / loops * loop) * easing,
                posY = options.pos[1] + (options.deltaY / loops * loop) * easing,
                rotation = options.rotation / loops * loop,
                touches = getTouches([posX, posY], startTouches.length, radius, rotation),
                isFirst = (loop == 1),
                isLast = (loop == loops);

            if (isFirst) {
                triggerTouch(touches, element, 'start');
            } else if (isLast) {
                triggerTouch(touches, element, 'end');
                return done();
            } else {
                triggerTouch(touches, element, 'move');
            }

            setTimeout(gestureLoop, interval);
            loop++;
        }
        gestureLoop();
    }


    var gestures = {
        press: function(element, options, done) {
            options = merge(options, {
                pos: [10, 10],
                duration: 500,
                touches: 1
            });

            var touches = getTouches(options.pos, 1);

            triggerTouch(touches, element, 'start');
            setTimeout(function() {
                triggerTouch(touches, element, 'end');
                setTimeout(done, 25);
            }, options.duration);
        },

        tap: function(element, options, done) {
            options = merge(options, {
                pos: [10, 10],
                duration: 100,
                touches: 1
            });

            var touches = getTouches(options.pos, 1);

            triggerTouch(touches, element, 'start');
            setTimeout(function() {
                triggerTouch(touches, element, 'end');
                setTimeout(done, 25);
            }, options.duration);
        },

        doubleTap: function(element, options, done) {
            options = merge(options, {
                pos: [10, 10],
                pos2: [11, 11],
                duration: 100,
                interval: 200,
                touches: 1
            });

            gestures.tap(element, options, function() {
                setTimeout(function() {
                    options.pos = options.pos2;
                    gestures.tap(element, options, done);
                }, options.interval);
            });
        },

        pan: function(element, options, done) {
            options = merge(options, {
                pos: [10, 10],
                deltaX: 300,
                deltaY: 150,
                duration: 250,
                touches: 1
            });
            var touches = getTouches(options.pos, options.touches);
            triggerGesture(element, touches, options, function() {
                setTimeout(done, 25);
            });
        },

        swipe: function(element, options, done) {
            options = merge(options, {
                pos: [10, 10],
                deltaX: 300,
                deltaY: 150,
                duration: 250,
                touches: 1,
                easing: 'expo'
            });
            var touches = getTouches(options.pos, options.touches);
            triggerGesture(element, touches, options, function() {
                setTimeout(done, 25);
            });
        },

        pinch: function(element, options, done) {
            options = merge(options, {
                pos: [300, 300],
                scale: 2,
                duration: 250,
                radius: 100,
                touches: 2
            });
            var touches = getTouches(options.pos, options.touches);
            triggerGesture(element, touches, options, function() {
                setTimeout(done, 25);
            });
        },

        rotate: function(element, options, done) {
            options = merge(options, {
                pos: [300, 300],
                rotation: 180,
                duration: 250,
                touches: 2
            });
            var touches = getTouches(options.pos, options.touches);
            triggerGesture(element, touches, options, function() {
                setTimeout(done, 25);
            });
        },

        pinchRotate: function(element, options, done) {
            options = merge(options, {
                pos: [300, 300],
                rotation: 180,
                radius: 100,
                scale: .5,
                duration: 250,
                touches: 2
            });
            var touches = getTouches(options.pos, options.touches);
            triggerGesture(element, touches, options, function() {
                setTimeout(done, 25);
            });
        }
    };

    return gestures;
})();
