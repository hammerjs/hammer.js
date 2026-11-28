var el, hammer;

var tripleTapCount = 0,
    doubleTapCount = 0,
    tapCount = 0;

QUnit.module('Tap delay', {
    beforeEach: function() {
        el = utils.createHitArea();
        hammer = new Hammer(el, {recognizers: []});

        var tap = new Hammer.Tap({interval: 60});
        var doubleTap = new Hammer.Tap({event: 'doubleTap', taps: 2, interval: 60 });
        var tripleTap = new Hammer.Tap({event: 'tripleTap', taps: 3, interval: 60 });

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
    afterEach: function() {
        hammer.destroy();
    }
});
QUnit.test('When a tripleTap is fired, doubleTap and Tap should not be recognized', function(assert) {
    var done = assert.async();
    assert.expect(3);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        assert.equal(tripleTapCount, 1, 'one tripletap event');
        assert.equal(doubleTapCount, 0, 'no doubletap event');
        assert.equal(tapCount, 0, 'no singletap event');
        done();
    }, 90);
});
QUnit.test('When a doubleTap is fired, tripleTap and Tap should not be recognized', function(assert) {
    var done = assert.async();
    assert.expect(3);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        assert.equal(tripleTapCount, 0);
        assert.equal(doubleTapCount, 1);
        assert.equal(tapCount, 0);
        done();
    }, 90);
});

QUnit.test('When a tap is fired, tripleTap and doubleTap should not be recognized', function(assert) {
    var done = assert.async();
    assert.expect(3);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        assert.equal(tripleTapCount, 0);
        assert.equal(doubleTapCount, 0);
        assert.equal(tapCount, 1);
        done();
    }, 90);
});

QUnit.test('tryEmit resets failing recognizer timer when requireFailure blocks emission', function(assert) {
    assert.expect(2);

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

    assert.equal(tap.state, $H.STATE_FAILED, 'tap transitions to STATE_FAILED when doubleTap blocks tryEmit');
    assert.ok(resetCalls >= 3, 'tap.reset() called inside tryEmit() to cancel orphaned timer');
});

QUnit.test('TapRecognizer checks maxPointers and resets tap count across intervening Pan gestures', function(assert) {
    assert.expect(3);

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
    assert.equal(taps, 0, '2-finger tap lifting 10ms apart does not emit 1-finger tap');
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
    assert.equal(doubleTaps, 0, 'intervening Pan resets tap count (Pan before DoubleTap)');
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
    assert.equal(doubleTaps3, 0, 'intervening Pan resets tap count (DoubleTap before Pan)');
    mgr3.destroy();
});

QUnit.test('TapRecognizer with requireFailure preserves tapCount across rapid taps and resets when stopped', function(assert) {
    var done = assert.async();
    assert.expect(3);

    var localEl = utils.createHitArea();
    function feed(mgr, type, x, y, t) {
        var pt = {clientX: x, clientY: y};
        $H.inputHandler(mgr, type, {
            pointers: [pt],
            changedPointers: [pt],
            pointerType: 'touch',
            srcEvent: {target: localEl, timeStamp: t, cancelable: true, preventDefault: function() {}}
        });
    }

    // 1. Two rapid taps with tap.requireFailure(swipe) preserve tapCount === 2
    var mgr1 = new Hammer.Manager(localEl, {recognizers: []});
    var swipe1 = mgr1.add(new Hammer.Swipe());
    var tap1 = mgr1.add(new Hammer.Tap({interval: 40}));
    tap1.requireFailure(swipe1);
    var counts1 = [];
    mgr1.on('tap', function(ev) {
        counts1.push(ev.tapCount);
    });
    feed(mgr1, $H.INPUT_START, 50, 50, 10);
    feed(mgr1, $H.INPUT_END, 50, 50, 20);
    feed(mgr1, $H.INPUT_START, 50, 50, 30);
    feed(mgr1, $H.INPUT_END, 50, 50, 40);

    // 2. Calling manager.stop() between taps still clears tapCount
    var mgr2 = new Hammer.Manager(localEl, {recognizers: []});
    var swipe2 = mgr2.add(new Hammer.Swipe());
    var tap2 = mgr2.add(new Hammer.Tap({interval: 40}));
    tap2.requireFailure(swipe2);
    var counts2 = [];
    mgr2.on('tap', function(ev) {
        counts2.push(ev.tapCount);
    });
    feed(mgr2, $H.INPUT_START, 50, 50, 10);
    feed(mgr2, $H.INPUT_END, 50, 50, 20);
    mgr2.stop();
    feed(mgr2, $H.INPUT_START, 50, 50, 30);
    feed(mgr2, $H.INPUT_END, 50, 50, 40);

    // 3. Intervening Pan drag still clears tapCount even with requireFailure
    var mgr3 = new Hammer.Manager(localEl, {recognizers: []});
    var pan3 = mgr3.add(new Hammer.Pan({threshold: 10}));
    var tap3 = mgr3.add(new Hammer.Tap({interval: 40}));
    tap3.requireFailure(pan3);
    var counts3 = [];
    mgr3.on('tap', function(ev) {
        counts3.push(ev.tapCount);
    });
    feed(mgr3, $H.INPUT_START, 50, 50, 10);
    feed(mgr3, $H.INPUT_END, 50, 50, 20);
    feed(mgr3, $H.INPUT_START, 50, 50, 30);
    feed(mgr3, $H.INPUT_MOVE, 150, 50, 40);
    feed(mgr3, $H.INPUT_END, 150, 50, 50);
    feed(mgr3, $H.INPUT_START, 50, 50, 60);
    feed(mgr3, $H.INPUT_END, 50, 50, 70);

    setTimeout(function() {
        assert.deepEqual(counts1, [2], 'rapid taps with requireFailure emit tapCount === 2');
        assert.deepEqual(counts2, [1], 'manager.stop() between taps resets tapCount to 1');
        assert.deepEqual(counts3, [1], 'intervening Pan drag still resets tapCount to 1');
        mgr1.destroy();
        mgr2.destroy();
        mgr3.destroy();
        done();
    }, 90);
});

QUnit.test('Multi-pointer TapRecognizer handles sequential finger liftoff and clears _input after emit', function(assert) {
    var done = assert.async();
    assert.expect(4);

    var localEl = utils.createHitArea();
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

    // 1. 2-finger double-tap with sequential liftoff on both taps
    var mgr1 = new Hammer.Manager(localEl, {
        recognizers: [[Hammer.Tap, {event: 'twofingerdouble', pointers: 2, taps: 2}]]
    });
    var twoFingerDoubleCount = 0;
    mgr1.on('twofingerdouble', function() {
        twoFingerDoubleCount++;
    });

    feed(mgr1, $H.INPUT_START, [f1], [f1], 10);
    feed(mgr1, $H.INPUT_START, [f1, f2], [f2], 15);
    feed(mgr1, $H.INPUT_END, [f1, f2], [f2], 25);
    feed(mgr1, $H.INPUT_END, [f1], [f1], 35);

    feed(mgr1, $H.INPUT_START, [f1], [f1], 110);
    feed(mgr1, $H.INPUT_START, [f1, f2], [f2], 115);
    feed(mgr1, $H.INPUT_END, [f1, f2], [f2], 125);
    feed(mgr1, $H.INPUT_END, [f1], [f1], 135);

    assert.equal(twoFingerDoubleCount, 1, '2-finger double-tap recognizes despite sequential finger liftoff');
    assert.strictEqual(mgr1.get('twofingerdouble')._input, null, 'TapRecognizer._input is nulled after emitting');

    // 2. 2-finger single-tap with requireFailure(doubletap) preserves timer across trailing liftoff
    var mgr2 = new Hammer.Manager(localEl, {recognizers: []});
    var dt2 = mgr2.add(new Hammer.Tap({event: 'doubletap', pointers: 2, taps: 2, interval: 40}));
    var st2 = mgr2.add(new Hammer.Tap({event: 'tap', pointers: 2, taps: 1, interval: 40}));
    st2.requireFailure(dt2);

    var singleCounts = [];
    mgr2.on('tap', function(ev) {
        singleCounts.push(ev.tapCount);
    });

    feed(mgr2, $H.INPUT_START, [f1], [f1], 10);
    feed(mgr2, $H.INPUT_START, [f1, f2], [f2], 15);
    feed(mgr2, $H.INPUT_END, [f1, f2], [f2], 25);
    feed(mgr2, $H.INPUT_END, [f1], [f1], 35);

    setTimeout(function() {
        assert.deepEqual(singleCounts, [1], '2-finger tap with requireFailure emits after trailing finger liftoff');
        assert.strictEqual(st2._input, null, 'delayed TapRecognizer._input is nulled after emitting');
        mgr1.destroy();
        mgr2.destroy();
        done();
    }, 80);
});

QUnit.test('Multi-pointer TapRecognizer handles first-finger-first liftoff, trailing move, and avoids retaining _input on partial taps', function(assert) {
    var done = assert.async();
    assert.expect(5);

    var localEl = utils.createHitArea();
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

    // 0. Default single-finger doubletap must not retain _input after a single tap
    var mgr0 = new Hammer(localEl);
    feed(mgr0, $H.INPUT_START, [f1], [f1], 10);
    feed(mgr0, $H.INPUT_END, [f1], [f1], 20);
    assert.strictEqual(mgr0.get('doubletap')._input, null, 'default doubletap does not retain _input after a single tap');
    mgr0.destroy();

    // 1. 2-finger double-tap where f1 lifts BEFORE f2 (distance against firstInput is 30px >= threshold 9)
    var mgr1 = new Hammer.Manager(localEl, {
        recognizers: [[Hammer.Tap, {event: 'twofingerdouble', pointers: 2, taps: 2}]]
    });
    var doubleCount = 0;
    mgr1.on('twofingerdouble', function() {
        doubleCount++;
    });

    feed(mgr1, $H.INPUT_START, [f1], [f1], 10);
    feed(mgr1, $H.INPUT_START, [f1, f2], [f2], 15);
    feed(mgr1, $H.INPUT_END, [f1, f2], [f1], 25);
    feed(mgr1, $H.INPUT_END, [f2], [f2], 35);

    // Partial multi-tap (count=1 of taps=2) must NOT retain _input
    assert.strictEqual(mgr1.get('twofingerdouble')._input, null, 'partial multi-tap does not retain _input between taps');

    feed(mgr1, $H.INPUT_START, [f1], [f1], 110);
    feed(mgr1, $H.INPUT_START, [f1, f2], [f2], 115);
    feed(mgr1, $H.INPUT_END, [f1, f2], [f1], 125);
    feed(mgr1, $H.INPUT_END, [f2], [f2], 135);

    assert.equal(doubleCount, 1, '2-finger double-tap recognizes when first finger lifts before second');

    // 2. 2-finger tap with requireFailure survives trailing INPUT_MOVE before second finger lifts
    var mgr2 = new Hammer.Manager(localEl, {recognizers: []});
    var dt2 = mgr2.add(new Hammer.Tap({event: 'doubletap', pointers: 2, taps: 2, interval: 40}));
    var st2 = mgr2.add(new Hammer.Tap({event: 'tap', pointers: 2, taps: 1, interval: 40}));
    st2.requireFailure(dt2);
    var singleCount = 0;
    mgr2.on('tap', function() {
        singleCount++;
    });

    feed(mgr2, $H.INPUT_START, [f1], [f1], 10);
    feed(mgr2, $H.INPUT_START, [f1, f2], [f2], 15);
    feed(mgr2, $H.INPUT_END, [f1, f2], [f1], 25);
    feed(mgr2, $H.INPUT_MOVE, [f2], [f2], 30);
    feed(mgr2, $H.INPUT_END, [f2], [f2], 35);

    // 3. Trailing INPUT_CANCEL still cancels pending multi-pointer tap
    var mgr3 = new Hammer.Manager(localEl, {recognizers: []});
    var dt3 = mgr3.add(new Hammer.Tap({event: 'doubletap', pointers: 2, taps: 2, interval: 40}));
    var st3 = mgr3.add(new Hammer.Tap({event: 'tap', pointers: 2, taps: 1, interval: 40}));
    st3.requireFailure(dt3);
    var cancelledCount = 0;
    mgr3.on('tap', function() {
        cancelledCount++;
    });

    feed(mgr3, $H.INPUT_START, [f1], [f1], 10);
    feed(mgr3, $H.INPUT_START, [f1, f2], [f2], 15);
    feed(mgr3, $H.INPUT_END, [f1, f2], [f1], 25);
    feed(mgr3, $H.INPUT_CANCEL, [f2], [f2], 35);

    setTimeout(function() {
        assert.equal(singleCount, 1, '2-finger tap with requireFailure survives trailing INPUT_MOVE and f1-first liftoff');
        assert.equal(cancelledCount, 0, 'trailing INPUT_CANCEL still cancels pending multi-pointer tap');
        mgr1.destroy();
        mgr2.destroy();
        mgr3.destroy();
        done();
    }, 80);
});
