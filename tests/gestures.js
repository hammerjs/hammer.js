var el = document.getElementById('toucharea');

// force showing touches
Hammer.plugins.showTouches(true);

// faker
var faker = new FakeTouches(el);
if(set_faketouches_type) {
    faker.setTouchType(set_faketouches_type);
}

// hammer
var hammertime = new Hammer(el);


// all events
var all_events = ["touch", "release", "hold", "tap", "doubletap",
    "dragstart", "drag", "dragend", "dragleft", "dragright",
    "dragup", "dragdown", "swipe", "swipeleft", "swiperight",
    "swipeup", "swipedown", "transformstart", "transform",
    "transformend", "rotate", "pinch", "pinchin", "pinchout"];

// keep track of what events are triggered
var triggered_events = {};
hammertime.on(all_events.join(" "), function(ev) {
    triggered_events[ev.type] = ev;
});


/**
 * test gestures
 * @param   {String}    gesture
 * @param   {String}    expect_events
 * @param   {Function}  callback
 */
function testGesture(gesture, expect_events, callback) {
    // reset triggered events
    triggered_events = {};

    // trigger the gesture faker
    faker.triggerGesture(gesture, function() {
        var expect = expect_events.split(" ");
        var events = Object.keys(triggered_events);

        // trigger callback with true/false is all the events are triggered
        // if also any other events are triggered it is false
        var success = (events.length === expect.length);

        // error msg
        var msg = gesture +" detected";
        if(!success) {
            msg = gesture +" error. Events thrown: "+ events.join(" ");
        }
        callback(success, msg);
    });
}


/**
 * test gestures
 */
var gesture_tests = {
    'Hold' : 'touch hold release',
    'Tap' : 'touch tap release',
    'DoubleTap' : 'touch tap doubletap release',
    'DragRight' : 'touch drag dragstart dragright dragend release',
    'SwipeRight' : 'touch drag dragstart dragright dragend swipe swiperight release',
    'Rotate' : 'touch transform transformstart transformend rotate release',
    'PinchIn' : 'touch transform transformstart transformend pinch pinchin release',
    'PinchOut' : 'touch transform transformstart transformend pinch pinchout release'
};

for(var gesture in gesture_tests) {
    if(gesture_tests.hasOwnProperty(gesture)) {
        (function(gesture) {
            if(gesture_tests[gesture].match(/transform/) && !faker.has_multitouch) {
                return;
            }

            asyncTest(gesture, function() {
                testGesture(gesture, gesture_tests[gesture], function(success, msg) {
                    ok(success, msg);
                    start();
                });
            });
        })(gesture);
    }
}


/**
 * test eventData properies
 */
asyncTest('eventData', function() {
    triggered_events = {};

    faker.triggerGesture('DragRight', function() {
        var ev = triggered_events['dragright'];
        var checks = [];

        // test all properties
        ok(ev.type == 'dragright', 'ev.type');
        ok(_.isObject(ev.gesture), 'ev.gesture');
        ok(_.isNumber(ev.gesture.angle), 'ev.gesture.angle');
        ok(_.isObject(ev.gesture.center), 'ev.gesture.center');
        ok(_.isNumber(ev.gesture.deltaTime), 'ev.gesture.deltatime');
        ok(_.isNumber(ev.gesture.deltaX), 'ev.gesture.deltaX');
        ok(_.isNumber(ev.gesture.deltaY), 'ev.gesture.deltaY');
        ok(ev.gesture.direction === Hammer.DIRECTION_RIGHT, 'ev.gesture.direction');
        ok(_.isNumber(ev.gesture.distance), 'ev.gesture.distance');
        ok(ev.gesture.eventType === Hammer.EVENT_MOVE, 'ev.gesture.eventType');
        ok(ev.gesture.pointerType, 'ev.gesture.pointerType');
        ok(_.isFunction(ev.gesture.preventDefault), 'ev.gesture.preventDefault');
        ok(_.isNumber(ev.gesture.rotation), 'ev.gesture.rotation');
        ok(_.isNumber(ev.gesture.scale), 'ev.gesture.scale');
        ok(_.isObject(ev.gesture.srcEvent), 'ev.gesture.srcEvent');
        ok(_.isObject(ev.gesture.startEvent), 'ev.gesture.startEvent');
        ok(_.isFunction(ev.gesture.stop), 'ev.gesture.stop');
        ok(_.isFunction(ev.gesture.stopPropagation), 'ev.gesture.stopPropagation');
        ok(_.isElement(ev.gesture.target), 'ev.gesture.target');
        ok(_.isNumber(ev.gesture.timestamp), 'ev.gesture.timestamp');
        ok(_.isArray(ev.gesture.touches), 'ev.gesture.touches');
        ok(_.isNumber(ev.gesture.velocityX), 'ev.gesture.velocityX');
        ok(_.isNumber(ev.gesture.velocityY), 'ev.gesture.velocityY');

        start();
    });
});