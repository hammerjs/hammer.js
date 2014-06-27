var el, hammer, events;
var allGestureEvents = [
    'tap doubletap press',
    'pinch pinchin pinchout rotate',
    'panstart pan panup pandown panleft panright panend pancancel',
    'panstart pan panup pandown panleft panright panend pancancel',
    'swipe swipeleft swiperight swipeup swipedown'].join(" ");

module('Gesture recognition', {
    setup: function () {
        el = document.createElement('div');
        document.body.appendChild(el);

        hammer = new Hammer(el);
        hammer.get('pinch')
            .set('enable', true)
            .set('threshold', .1); // some threshold, since the simulator doesnt stays at scale:1 when rotating
        hammer.get('rotate').set('enable', true);

        hammer.on(allGestureEvents, function (ev) {
            events[ev.type] = true;
        });

        events = {};
    },

    teardown: function () {
        document.body.removeChild(el);
        hammer && hammer.destroy();
    }
});

asyncTest("recognize pan", function () {
    expect(1);

    Simulator.gestures.pan(el, { deltaX: 50, deltaY: 0 }, function () {
        start();
        deepEqual({
            panstart: true,
            pan: true,
            panright: true,
            panend: true
        }, events);
    });
});

asyncTest("recognize press", function () {
    expect(1);

    Simulator.gestures.press(el, null, function () {
        start();
        deepEqual({
            press: true
        }, events);
    });
});

asyncTest("recognize swipe", function () {
    expect(1);

    Simulator.gestures.swipe(el, { duration: 500 }, function () {
        start();
        deepEqual({
            panstart: true,
            pan: true,
            panright: true,
            panend: true,
            swipe: true,
            swiperight: true
        }, events);
    });
});

asyncTest("recognize pinch", function () {
    expect(1);

    Simulator.gestures.pinch(el, { duration: 500, scale: .5 }, function () {
        start();
        deepEqual({
            pinch: true,
            pinchin: true
        }, events);
    });
});

asyncTest("recognize rotate", function () {
    expect(1);

    Simulator.gestures.rotate(el, { duration: 500, scale: 1 }, function () {
        start();
        deepEqual({
            rotate: true
        }, events);
    });
});

asyncTest("recognize rotate and pinch simultaneous", function () {
    expect(1);

    Simulator.gestures.pinchRotate(el, { duration: 500, scale: 2 }, function () {
        start();
        deepEqual({
            rotate: true,
            pinch: true,
            pinchout: true
        }, events);
    });
});

asyncTest("don't recognize pan and swipe when moving down, when only horizontal is allowed", function () {
    expect(1);

    Simulator.gestures.swipe(el, { duration: 500, deltaX: 0, deltaZ: 200 }, function () {
        start();
        deepEqual({ }, events);
    });
});

asyncTest("don't recognize press when a -invalid- tap has been done", function () {
    expect(1);

    Simulator.gestures.press(el, { duration: 500 });

    setTimeout(function () {
        Simulator.gestures.tap(el, { duration: 500 });
    }, 200);

    setTimeout(function () {
        start();
        deepEqual({ }, events, 'no gesture has been recognized. invalid tap and invalid press.');
    }, 700);
});
