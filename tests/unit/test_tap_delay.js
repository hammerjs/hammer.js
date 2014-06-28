var el, hammer;

var tripleTapCount = 0,
    doubleTapCount = 0,
    tapCount = 0;

module('Tap delay', {
    setup: function() {
        el = document.createElement('div');
        document.body.appendChild(el);

        hammer = new Hammer(el, {recognizers: []});

        var tap = new Hammer.Tap({ delay: 250 });
        var doubleTap = new Hammer.Tap({event: 'doubleTap', delay: 250, taps: 2});
        var tripleTap = new Hammer.Tap({event: 'tripleTap', delay: 250, taps: 3});

        hammer.add(tripleTap);
        hammer.add(doubleTap);
        hammer.add(tap);

        tripleTapCount = 0;
        doubleTapCount = 0;
        tapCount = 0;

        hammer.on('tap', function() { tapCount++;  });
        hammer.on('doubleTap', function() { doubleTapCount++; });
        hammer.on('tripleTap', function() { tripleTapCount++; });
    },
    teardown: function() {
        document.body.removeChild(el);
        hammer.destroy();
    }
});

asyncTest('When a tripleTap is fired, doubleTap and Tap should not be recognized', function() {
    expect(3);

    testUtils.dispatchTouchEvent(el, 'start', 50, 50);
    testUtils.dispatchTouchEvent(el, 'end', 50, 50);
    testUtils.dispatchTouchEvent(el, 'start', 50, 50);
    testUtils.dispatchTouchEvent(el, 'end', 50, 50);
    testUtils.dispatchTouchEvent(el, 'start', 50, 50);
    testUtils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        start();
        equal(tripleTapCount, 1);
        equal(doubleTapCount, 0);
        equal(tapCount, 0);
    }, 350);
});

asyncTest('When a doubleTap is fired, tripleTap and Tap should not be recognized', function() {
    expect(3);

    testUtils.dispatchTouchEvent(el, 'start', 50, 50);
    testUtils.dispatchTouchEvent(el, 'end', 50, 50);
    testUtils.dispatchTouchEvent(el, 'start', 50, 50);
    testUtils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        start();
        equal(tripleTapCount, 0);
        equal(doubleTapCount, 1);
        equal(tapCount, 0);
    }, 350);
});

asyncTest('When a tap is fired, tripleTap and doubleTap should not be recognized', function() {
    expect(3);

    testUtils.dispatchTouchEvent(el, 'start', 50, 50);
    testUtils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        start();
        equal(tripleTapCount, 0);
        equal(doubleTapCount, 0);
        equal(tapCount, 1);
    }, 350);
});
