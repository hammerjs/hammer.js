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
