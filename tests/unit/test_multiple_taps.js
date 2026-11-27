var el, hammer;

var tripleTapCount = 0,
    doubleTapCount = 0,
    tapCount = 0;

module('Tap delay', {
    setup: function() {
        el = utils.createHitArea();
        hammer = new Hammer(el, {recognizers: []});

        var tap = new Hammer.Tap();
        var doubleTap = new Hammer.Tap({event: 'doubleTap', taps: 2 });
        var tripleTap = new Hammer.Tap({event: 'tripleTap', taps: 3 });

        hammer.add([tripleTap, doubleTap, tap]);

        tripleTap.recognizeWith([doubleTap, tap]);
        doubleTap.recognizeWith(tap);

        doubleTap.requireFailure(tripleTap);
        tap.requireFailure([tripleTap, doubleTap]);

        tripleTapCount = 0;
        doubleTapCount = 0;
        tapCount = 0;

        hammer.on('tap', function() {
            tapCount++;
        });
        hammer.on('doubleTap', function() {
            doubleTapCount++;
        });
        hammer.on('tripleTap', function() {
            tripleTapCount++;
        });
    },
    teardown: function() {
        hammer.destroy();
    }
});
asyncTest('When a tripleTap is fired, doubleTap and Tap should not be recognized', function() {
    expect(3);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        start();
        equal(tripleTapCount, 1, 'one tripletap event');
        equal(doubleTapCount, 0, 'no doubletap event');
        equal(tapCount, 0, 'no singletap event');
    }, 350);
});
asyncTest('When a doubleTap is fired, tripleTap and Tap should not be recognized', function() {
    expect(3);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        start();
        equal(tripleTapCount, 0);
        equal(doubleTapCount, 1);
        equal(tapCount, 0);
    }, 350);
});

asyncTest('When a tap is fired, tripleTap and doubleTap should not be recognized', function() {
    expect(3);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        start();
        equal(tripleTapCount, 0);
        equal(doubleTapCount, 0);
        equal(tapCount, 1);
    }, 350);
});

test('tryEmit resets failing recognizer timer when requireFailure blocks emission', function() {
    expect(2);

    var tap = hammer.get('tap');
    var resetCalls = 0;
    var origReset = tap.reset;
    tap.reset = function() {
        resetCalls++;
        return origReset.apply(this, arguments);
    };

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    resetCalls = 0;

    // Second tap causes doubleTap to enter STATE_BEGAN, so tap.tryEmit() must fail and reset its timer
    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    equal(tap.state, $H.STATE_FAILED, 'tap transitions to STATE_FAILED when doubleTap blocks tryEmit');
    ok(resetCalls >= 3, 'tap.reset() called inside tryEmit() to cancel orphaned timer');
});

test('TapRecognizer checks maxPointers and resets tap count across intervening Pan gestures', function() {
    expect(3);

    // 1. 2-finger tap lifting sequentially must not fire a 1-finger tap
    var localEl = utils.createHitArea();
    var mgr1 = new Hammer.Manager(localEl, {recognizers: [[Hammer.Tap, {pointers: 1}]]});
    var taps = 0;
    mgr1.on('tap', function() {
        taps++;
    });

    function feed(mgr, type, pointers, changed, t) {
        $H.inputHandler(mgr, type, {
            pointers: pointers,
            changedPointers: changed,
            pointerType: 'touch',
            srcEvent: {target: localEl, timeStamp: t, cancelable: true, preventDefault: function() {}}
        });
    }

    var f1 = {clientX: 50, clientY: 50};
    var f2 = {clientX: 80, clientY: 50};
    feed(mgr1, $H.INPUT_START, [f1], [f1], 10);
    feed(mgr1, $H.INPUT_START, [f1, f2], [f2], 15);
    feed(mgr1, $H.INPUT_END, [f1, f2], [f2], 25);
    feed(mgr1, $H.INPUT_END, [f1], [f1], 35);
    equal(taps, 0, '2-finger tap lifting 10ms apart does not emit 1-finger tap');
    mgr1.destroy();

    // 2. Tap -> 100px Pan -> Tap within 300ms must not pair into doubletap (default preset order: Pan before DoubleTap)
    var mgr2 = new Hammer(localEl);
    var doubleTaps = 0;
    mgr2.on('doubletap', function() {
        doubleTaps++;
    });
    // Tap 1
    feed(mgr2, $H.INPUT_START, [{clientX: 50, clientY: 50}], [{clientX: 50, clientY: 50}], 100);
    feed(mgr2, $H.INPUT_END, [{clientX: 50, clientY: 50}], [{clientX: 50, clientY: 50}], 110);
    // 100px Pan
    feed(mgr2, $H.INPUT_START, [{clientX: 50, clientY: 50}], [{clientX: 50, clientY: 50}], 130);
    feed(mgr2, $H.INPUT_MOVE, [{clientX: 150, clientY: 50}], [{clientX: 150, clientY: 50}], 150);
    feed(mgr2, $H.INPUT_END, [{clientX: 150, clientY: 50}], [{clientX: 150, clientY: 50}], 160);
    // Tap 2 at original position within 300ms of Tap 1
    feed(mgr2, $H.INPUT_START, [{clientX: 50, clientY: 50}], [{clientX: 50, clientY: 50}], 180);
    feed(mgr2, $H.INPUT_END, [{clientX: 50, clientY: 50}], [{clientX: 50, clientY: 50}], 190);
    equal(doubleTaps, 0, 'intervening Pan resets tap count (Pan before DoubleTap)');
    mgr2.destroy();

    // 3. Same sequence when DoubleTap is registered BEFORE Pan
    var mgr3 = new Hammer.Manager(localEl, {
        recognizers: [
            [Hammer.Tap, {event: 'doubletap', taps: 2}],
            [Hammer.Pan, {threshold: 10}]
        ]
    });
    var doubleTaps3 = 0;
    mgr3.on('doubletap', function() {
        doubleTaps3++;
    });
    feed(mgr3, $H.INPUT_START, [{clientX: 50, clientY: 50}], [{clientX: 50, clientY: 50}], 100);
    feed(mgr3, $H.INPUT_END, [{clientX: 50, clientY: 50}], [{clientX: 50, clientY: 50}], 110);
    feed(mgr3, $H.INPUT_START, [{clientX: 50, clientY: 50}], [{clientX: 50, clientY: 50}], 130);
    feed(mgr3, $H.INPUT_MOVE, [{clientX: 150, clientY: 50}], [{clientX: 150, clientY: 50}], 150);
    feed(mgr3, $H.INPUT_END, [{clientX: 150, clientY: 50}], [{clientX: 150, clientY: 50}], 160);
    feed(mgr3, $H.INPUT_START, [{clientX: 50, clientY: 50}], [{clientX: 50, clientY: 50}], 180);
    feed(mgr3, $H.INPUT_END, [{clientX: 50, clientY: 50}], [{clientX: 50, clientY: 50}], 190);
    equal(doubleTaps3, 0, 'intervening Pan resets tap count (DoubleTap before Pan)');
    mgr3.destroy();
});
