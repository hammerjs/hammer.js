var el,
    hammer,
    pressPeriod = 40,
    pressThreshold = 20,
    pressCount = 0,
    panStartCount = 0,
    swipeCount = 0;

QUnit.module('Require Failure ( Swipe & Press )', {
    beforeEach: function() {
        el = utils.createHitArea();
        hammer = new Hammer(el, {recognizers: []});

        var swipe = new Hammer.Swipe({threshold: 1});
        var press = new Hammer.Press({time: pressPeriod, threshold: pressThreshold});

        hammer.add(swipe);
        hammer.add(press);

        swipe.recognizeWith(press);
        press.requireFailure(swipe);

        pressCount = 0;
        swipeCount = 0;
        hammer.on('press', function() {
            pressCount++;
        });
        hammer.on('swipe', function() {
            swipeCount++;
        });
    },
    afterEach: function() {
        hammer.destroy();
    }
});

QUnit.test('When swipe does not recognize the gesture, a press gesture can be fired', function(assert) {
    var done = assert.async();
    assert.expect(1);

    utils.dispatchTouchEvent(el, 'start', 50, 50);

    setTimeout(function() {
        assert.equal(pressCount, 1);
        done();
    }, pressPeriod + 40);
});

QUnit.test('When swipe does recognize the gesture, a press gesture cannot be fired', function(assert) {
    var done = assert.async();
    assert.expect(2);

    Simulator.gestures.swipe(el, { duration: 60 }, function() {

        assert.ok(swipeCount > 0, 'swipe gesture should be recognizing');
        assert.equal(pressCount, 0, 'press gesture should not be recognized because swipe gesture is recognizing');
        done();
    });
});
QUnit.module('Require Failure ( Pan & Press )', {
    beforeEach: function() {
        el = document.createElement('div');
        document.body.appendChild(el);

        hammer = new Hammer(el, {recognizers: []});

        var pan = new Hammer.Pan({threshold: 1});
        var press = new Hammer.Press({time: pressPeriod, threshold: pressThreshold});

        hammer.add([pan, press]);

        pan.recognizeWith(press);
        press.requireFailure(pan);

        pressCount = 0;
        panStartCount = 0;
        hammer.on('press', function() {
            pressCount++;
        });
        hammer.on('panstart', function() {
            panStartCount++;
        });
    },
    afterEach: function() {
        document.body.removeChild(el);
        hammer.destroy();
    }
});

QUnit.test('When pan does not recognize the gesture, a press gesture can be fired', function(assert) {
    var done = assert.async();
    assert.expect(1);

    utils.dispatchTouchEvent(el, 'start', 50, 50);

    setTimeout(function() {
        assert.equal(pressCount, 1);
        done();
    }, pressPeriod + 40);
});

QUnit.test('When pan recognizes the gesture, a press gesture cannot be fired', function(assert) {
    var done = assert.async();
    assert.expect(2);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'move', 50 + pressThreshold / 4, 50);

    setTimeout(function() {

        assert.ok(panStartCount > 0, 'pan gesture should be recognizing');
        assert.equal(pressCount, 0, 'press gesture should not be recognized because pan gesture is recognizing');
        done();
    }, pressPeriod + 40);
});

QUnit.test('recognizeWith and requireFailure methods ignore unknown recognizer names', function(assert) {
    assert.expect(5);

    var pan = hammer.get('pan');
    var initialSimultaneous = Object.keys(pan.simultaneous).length;
    var initialRequireFail = pan.requireFail.length;

    assert.equal(pan.recognizeWith('nonexistent'), pan, 'recognizeWith returns recognizer for unknown name');
    assert.equal(pan.dropRecognizeWith('nonexistent'), pan, 'dropRecognizeWith returns recognizer for unknown name');
    assert.equal(pan.requireFailure('nonexistent'), pan, 'requireFailure returns recognizer for unknown name');
    assert.equal(pan.dropRequireFailure('nonexistent'), pan, 'dropRequireFailure returns recognizer for unknown name');

    assert.ok(
        Object.keys(pan.simultaneous).length === initialSimultaneous &&
        pan.requireFail.length === initialRequireFail &&
        pan.canEmit(),
        'simultaneous and requireFail are unchanged and canEmit does not throw'
    );
});

QUnit.test('Manager.remove resets removed recognizer state and drops dangling requireFail/simultaneous references', function(assert) {
    assert.expect(5);

    var localEl = utils.createHitArea();
    var mgr = new Hammer.Manager(localEl, {recognizers: []});
    var pan = mgr.add(new Hammer.Pan({threshold: 5}));
    var tap = mgr.add(new Hammer.Tap());
    tap.requireFailure(pan);
    tap.recognizeWith(pan);

    var tapCount = 0;
    mgr.on('tap', function() {
        tapCount++;
    });

    try {
        // Put pan into STATE_BEGAN, then remove pan mid-gesture
        utils.dispatchTouchEvent(localEl, 'start', 10, 10);
        utils.dispatchTouchEvent(localEl, 'move', 30, 10);
        mgr.remove('pan');

        assert.equal(pan.state, Hammer.STATE_POSSIBLE, 'removed recognizer state reset to STATE_POSSIBLE');
        assert.equal(tap.requireFail.length, 0, 'dangling requireFailure reference dropped from remaining recognizer');
        assert.equal(tap.canRecognizeWith(pan), false, 'dangling recognizeWith reference dropped from remaining recognizer');
        assert.equal(tap.canEmit(), true, 'remaining dependent recognizer is no longer permanently blocked');

        // Subsequent tap must succeed
        utils.dispatchTouchEvent(localEl, 'start', 20, 20);
        utils.dispatchTouchEvent(localEl, 'end', 20, 20);
        assert.equal(tapCount, 1, 'dependent tap recognizes after active required recognizer is removed');
    } finally {
        mgr.destroy();
    }
});
