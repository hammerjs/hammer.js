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

    Simulator.pan(el, null, function() {
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

    Simulator.swipe(el, { duration: 500 }, function() {
        start();
        equal(Object.keys(events).length, 2);
    });
});

asyncTest("recognize pinch", function () {
    expect(1);

    var events = {};

    hammer = new Hammer.Manager(el);
    hammer.add(new Hammer.Pinch());
    hammer.on('pinchout pinch', function(ev) {
        events[ev.type] = true;
    });

    Simulator.pinch(el, { duration: 500 }, function() {
        start();
        equal(Object.keys(events).length, 2);
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

    Simulator.rotate(el, { duration: 500 }, function() {
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
    hammer.on('rotate pinch pinchout', function(ev) {
        events[ev.type] = true;
    });

    Simulator.pinchRotate(el, { duration: 500 }, function() {
        start();
        equal(Object.keys(events).length, 3);
    });
});

asyncTest("recognize pan and swipe simultaneous", function () {
    expect(1);

    var events = {};

    hammer = new Hammer.Manager(el);
    hammer.add(new Hammer.Pan());
    hammer.add(new Hammer.Swipe()).recognizeWith('pan');
    hammer.on('pan swipe', function(ev) {
        events[ev.type] = true;
    });

    Simulator.swipe(el, { duration: 500 }, function() {
        start();
        equal(Object.keys(events).length, 2);
    });
});
