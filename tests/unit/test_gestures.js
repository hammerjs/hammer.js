// TODO: this tests fails because tapRecognizer changes
// it could be that tapRecognizer setup its BEGAN state and
// disable the other gesture recognition
var el, hammer, events;
var allGestureEvents = [
    'tap doubletap press',
    'pinch pinchin pinchout pinchstart pinchmove pinchend pinchcancel',
    'rotate rotatestart rotatemove rotateend rotatecancel',
    'pan panstart panmove panup pandown panleft panright panend pancancel',
    'swipe swipeleft swiperight swipeup swipedown'
].join(' ');

module('Gesture recognition', {
    setup: function() {
        el = utils.createHitArea();
        hammer = new Hammer(el);
        hammer.get('pinch')
            .set({ // some threshold, since the simulator doesnt stays at scale:1 when rotating
                enable: true,
                threshold: .1
            });

        hammer.get('rotate')
            .set({ enable: true });

        hammer.on(allGestureEvents, function(ev) {
            events[ev.type] = true;
        });
        events = {};
    },
    teardown: function() {
        hammer && hammer.destroy();
        events = null;
    }
});

asyncTest('recognize pan', function() {
    expect(1);

    Simulator.gestures.pan(el, { duration: 500, deltaX: 100, deltaY: 0 }, function() {
        start();
        deepEqual(events, {
            pan: true,
            panstart: true,
            panmove: true,
            panright: true,
            panend: true
        });
    });
});

asyncTest('recognize press', function() {
    expect(1);

    Simulator.gestures.press(el, null, function() {
        start();
        deepEqual(events, {
            press: true
        });
    });
});

asyncTest('recognize swipe', function() {
    expect(1);

    Simulator.gestures.swipe(el, { duration: 300, deltaX: 400, deltaY: 0 }, function() {
        start();
        deepEqual(events, {
            pan: true,
            panstart: true,
            panmove: true,
            panright: true,
            panend: true,
            swipe: true,
            swiperight: true
        });
    });
});

asyncTest('recognize pinch', function() {
    expect(1);

    Simulator.gestures.pinch(el, { duration: 500, scale: .5 }, function() {
        start();
        deepEqual(events, {
            pinch: true,
            pinchstart: true,
            pinchmove: true,
            pinchend: true,
            pinchin: true
        });
    });
});

asyncTest('recognize children multitouch pinch', function() {
    expect(1);

    var el1 = utils.createHitArea(el),
        el2 = utils.createHitArea(el);

    Simulator.gestures.pinch([el1, el2], { duration: 500, scale: .5 }, function() {
        start();
        deepEqual(events, {
            pinch: true,
            pinchstart: true,
            pinchmove: true,
            pinchend: true,
            pinchin: true
        });
    });
});

asyncTest('recognize parent-child multitouch pinch', function() {
    expect(1);

    var el1 = utils.createHitArea(el);

    Simulator.gestures.pinch([el, el1], { duration: 100, scale: .5 }, function() {
        start();
        deepEqual(events, {
            pinch: true,
            pinchstart: true,
            pinchmove: true,
            pinchend: true,
            pinchin: true
        });
    });
});

asyncTest('recognize rotate', function() {
    expect(1);

    Simulator.gestures.rotate(el, { duration: 500, scale: 1 }, function() {
        start();
        deepEqual(events, {
            rotate: true,
            rotatestart: true,
            rotatemove: true,
            rotateend: true
        });
    });
});

asyncTest('recognize multitouch rotate', function() {
    expect(1);

    var el1 = utils.createHitArea(el);

    Simulator.gestures.rotate([el, el1], { duration: 500, scale: 1 }, function() {
        start();
        deepEqual(events, {
            rotate: true,
            rotatestart: true,
            rotatemove: true,
            rotateend: true
        });
    });
});

asyncTest('recognize rotate and pinch simultaneous', function() {
    expect(1);

    Simulator.gestures.pinchRotate(el, { duration: 500, scale: 2 }, function() {
        start();
        deepEqual(events, {
            rotate: true,
            rotatestart: true,
            rotatemove: true,
            rotateend: true,
            pinch: true,
            pinchstart: true,
            pinchmove: true,
            pinchend: true,
            pinchout: true
        });
    });
});

asyncTest('don\'t recognize pan and swipe when moving down, when only horizontal is allowed', function() {
    expect(1);

    Simulator.gestures.swipe(el, { duration: 250, deltaX: 0, deltaZ: 200 }, function() {
        start();
        deepEqual(events, { });
    });
});

asyncTest('don\'t recognize press if duration is too short.', function() {
    expect(1);

    Simulator.gestures.press(el, { duration: 240 });

    setTimeout(function() {
        start();
        deepEqual(events, { tap: true }, 'Tap gesture has been recognized.');
    }, 275);
});

asyncTest('don\'t recognize tap if duration is too long.', function() {
    expect(1);

    Simulator.gestures.tap(el, { duration: 255 });

    setTimeout(function() {
        start();
        deepEqual(events, { press: true }, 'Press gesture has been recognized.');
    }, 275);
});

test('getRotation and computeInputData stay continuous across the +-180deg boundary', function() {
    expect(5);

    // Horizontal start puts getAngle(p1, p0) right on +180deg; rotating 10deg CW crosses to -170deg
    var startHoriz = [{clientX: 0, clientY: 0}, {clientX: 100, clientY: 0}];
    var cwSmall = [
        {clientX: 100 - 100 * Math.cos(10 * Math.PI / 180), clientY: -100 * Math.sin(10 * Math.PI / 180)},
        {clientX: 100, clientY: 0}
    ];
    var ccwSmall = [
        {clientX: 100 - 100 * Math.cos(10 * Math.PI / 180), clientY: 100 * Math.sin(10 * Math.PI / 180)},
        {clientX: 100, clientY: 0}
    ];
    equal(Math.round($H.getRotation(startHoriz, cwSmall)), 10, 'small CW turn across +180deg returns +10 instead of -350');
    equal(Math.round($H.getRotation(startHoriz, ccwSmall)), -10, 'small CCW turn across +180deg returns -10');

    // Continuous multi-step rotation past +180deg unwraps smoothly without jumping to -170deg
    var mgr = new Hammer.Manager(el, {recognizers: []});
    var step = function(deg, type) {
        var rad = deg * Math.PI / 180;
        var p0 = {clientX: 50 + 50 * Math.cos(rad), clientY: 50 + 50 * Math.sin(rad)};
        var p1 = {clientX: 50 - 50 * Math.cos(rad), clientY: 50 - 50 * Math.sin(rad)};
        var input = {
            eventType: type,
            pointers: [p0, p1],
            changedPointers: [p0, p1],
            pointerType: 'touch',
            srcEvent: {target: el, timeStamp: 10 + deg}
        };
        $H.computeInputData(mgr, input);
        mgr.session.prevInput = input;
        return Math.round(input.rotation);
    };

    try {
        equal(step(0, $H.INPUT_START), 0, 'initial rotation is 0');
        step(90, $H.INPUT_MOVE);
        step(170, $H.INPUT_MOVE);
        equal(step(190, $H.INPUT_MOVE), 190, 'crossing +180deg continues smoothly to +190');
        step(280, $H.INPUT_MOVE);
        equal(step(370, $H.INPUT_MOVE), 370, 'full revolution continues smoothly to +370');
    } finally {
        mgr.destroy();
    }
});

test('getRotation computes angle difference and returns 0 for stationary pointers', function() {
    expect(3);

    var startDiag = [{clientX: 0, clientY: 0}, {clientX: 100, clientY: 100}];
    equal($H.getRotation(startDiag, startDiag), 0, 'stationary diagonal pointers have 0 rotation');

    var startVert = [{clientX: 0, clientY: 0}, {clientX: 0, clientY: -100}];
    var endCW = [{clientX: 0, clientY: 0}, {clientX: 100, clientY: -100}];
    var endCCW = [{clientX: 0, clientY: 0}, {clientX: -100, clientY: -100}];
    equal(Math.round($H.getRotation(startVert, endCW)), 45, 'clockwise 45-degree rotation returns 45');
    equal(Math.round($H.getRotation(startVert, endCCW)), -45, 'counter-clockwise 45-degree rotation returns -45');
});

test('TapRecognizer does not arm a timer on pointer start or move', function() {
    expect(3);

    var tap = hammer.get('tap');
    strictEqual(tap._timer, null, 'initial tap timer is null');

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    strictEqual(tap._timer, null, 'no timer armed on touchstart');

    utils.dispatchTouchEvent(el, 'move', 52, 50);
    strictEqual(tap._timer, null, 'no timer armed on touchmove');
});
