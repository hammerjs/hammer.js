var el,
    hammer;

module('Gesture recognition', {
    setup: function () {
        el = document.createElement('div');
        document.body.appendChild(el);

    },
    teardown: function () {
        document.body.removeChild(el);
        hammer && hammer.destroy();
    }
});

asyncTest("recognize pan", function () {
    expect(1);

    var events = {};

    hammer = new Hammer.Manager(el);
    hammer.add(new Hammer.Pan());
    hammer.on('panstart pan panright panend', function(ev) {
        events[ev.type] = true;
    });

    Simulator.gestures.pan(el, null, function() {
        start();
        equal(Object.keys(events).length, 4);
    });
});

asyncTest("recognize swipe", function () {
    expect(1);

    var events = {};

    hammer = new Hammer.Manager(el);
    hammer.add(new Hammer.Swipe());
    hammer.on('swipe swiperight', function(ev) {
        events[ev.type] = true;
    });

    Simulator.gestures.swipe(el, { duration: 500 }, function() {
        start();
        equal(Object.keys(events).length, 2);
    });
});

asyncTest("recognize pinch", function () {
    expect(1);

    var events = {};

    hammer = new Hammer.Manager(el);
    hammer.add(new Hammer.Pinch());
    hammer.on('pinchout pinch pinchin', function(ev) {
        events[ev.type] = true;
    });

    Simulator.gestures.pinch(el, { duration: 500 }, function() {
        start();
        equal(Object.keys(events).length, 2); // only pinch and pinchout
    });
});

asyncTest("recognize rotate", function () {
    expect(1);

    var events = {};

    hammer = new Hammer.Manager(el);
    hammer.add(new Hammer.Rotate());
    hammer.on('rotate', function(ev) {
        events[ev.type] = true;
    });

    Simulator.gestures.rotate(el, { duration: 500 }, function() {
        start();
        equal(Object.keys(events).length, 1);
    });
});

asyncTest("recognize rotate and pinch simultaneous", function () {
    expect(1);

    var events = {};

    hammer = new Hammer.Manager(el);
    hammer.add(new Hammer.Rotate());
    hammer.add(new Hammer.Pinch()).recognizeWith('rotate');
    hammer.on('rotate pinch pinchin pinchout', function(ev) {
        events[ev.type] = true;
    });

    Simulator.gestures.pinchRotate(el, { duration: 500 }, function() {
        start();
        equal(Object.keys(events).length, 3); // pinch pinchout and rotate
    });
});

asyncTest("recognize pan and swipe simultaneous", function () {
    expect(1);

    var events = {};

    hammer = new Hammer.Manager(el);
    hammer.add(new Hammer.Pan());
    hammer.add(new Hammer.Swipe()).recognizeWith('pan');
    hammer.on('pan swipe swiperight', function(ev) {
        events[ev.type] = true;
    });

    Simulator.gestures.swipe(el, { duration: 500 }, function() {
        start();
        equal(Object.keys(events).length, 3);
    });
});

asyncTest("recognize gestures", function () {
    expect(3);

    var events = {};

    hammer = new Hammer(el);
    hammer.on('panstart pan panend swipe pinchin pinchout pinch rotate tap doubletap press', function(ev) {
        events[ev.type] = true;
    });

    // pinch and rotate are disabled by default
    hammer.get('pinch').set('enable', true);
    hammer.get('rotate').set('enable', true);

    // swipe + pan
    Simulator.gestures.swipe(el, { duration: 500 }, function() {
        equal(Object.keys(events).length, 4, "expect panstart pan panend swipe");
        events = {};

        // pinchout
        Simulator.gestures.pinch(el, { duration: 500, scale: 2 }, function() {
            equal(Object.keys(events).length, 2, "pinchout pinch");
            events = {};

            // pinchin
            Simulator.gestures.pinch(el, { duration: 500, scale: .5 }, function() {
                equal(Object.keys(events).length, 2, "pinchin pinch");
                events = {};

                start();
            });

        });
    });
});
