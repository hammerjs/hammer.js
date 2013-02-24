var el = document.getElementById('toucharea');

// hammer and faker instance
var hammertime = new Hammer(el);
var faker = new FakeTouches(el);

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
 * test eventData
 */
asyncTest('eventData', function() {
    faker.triggerGesture('DragRight', function() {
        var ev = triggered_events['dragright'];

        var checks = [];

        checks.push(ev.type == 'dragright');
        checks.push(_.isObject(ev.gesture));
        checks.push(_.isNumber(ev.gesture.angle));
        checks.push(_.isObject(ev.gesture.center));
        checks.push(_.isNumber(ev.gesture.deltaTime));
        checks.push(_.isNumber(ev.gesture.deltaX));
        checks.push(_.isNumber(ev.gesture.deltaY));
        checks.push(ev.gesture.direction === Hammer.DIRECTION_RIGHT);
        checks.push(_.isNumber(ev.gesture.distance));
        checks.push(ev.gesture.eventType === Hammer.EVENT_MOVE);
        checks.push(ev.gesture.pointerType === Hammer.POINTER_TOUCH);
        checks.push(_.isFunction(ev.gesture.preventDefault));
        checks.push(_.isNumber(ev.gesture.rotation));
        checks.push(_.isNumber(ev.gesture.scale));
        checks.push(_.isObject(ev.gesture.srcEvent));
        checks.push(_.isObject(ev.gesture.startEvent));
        checks.push(_.isFunction(ev.gesture.stop));
        checks.push(_.isFunction(ev.gesture.stopPropagation));
        checks.push(_.isElement(ev.gesture.target));
        checks.push(_.isNumber(ev.gesture.timestamp));
        checks.push(_.isArray(ev.gesture.touches));
        checks.push(_.isNumber(ev.gesture.velocityX));
        checks.push(_.isNumber(ev.gesture.velocityY));

        var msg = 'EventData tested';
        var success = true;
        for(var c=0; c<checks.length; c++) {
            if(!checks[c]) {
                success = false;
                msg = 'EventData Test #'+ c +" failed";
                break;
            }
        }

        ok(success, msg);
        start();
    });
});