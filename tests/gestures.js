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
    triggered_events[ev.type] = true;
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

        // trigger callback with true/false is all the events are triggered
        // if also any other events are triggered it is false
        var success = (Object.keys(triggered_events).length === expect.length);

        var msg = gesture +" detected";
        if(!success) {
            msg = gesture +" error. Events thrown: "+ Object.keys(triggered_events).join(" ");
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
    'PinchOut' : 'touch transform transformstart transformend pinch pinchout release',
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