var el,
    hammer,
    counter;

module('Test recognizer enable', {
    setup: function() {
        el = utils.createHitArea();
        hammer = new Hammer.Manager(el, {recognizers: []});
        counter = 0;
    },
    teardown: function() {
        hammer && hammer.destroy();
    }
});

test('should disable a recognizer through the `enable` constructor parameter', function() {
    expect(1);
    hammer.add(new Hammer.Tap({enable: false}));
    hammer.on('tap', function() {
        counter++;
    });

    stop();
    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        start();
        equal(counter, 0);
    }, 100);
});

test('should disable recognizing when the manager is disabled.', function() {
    expect(1);
    hammer.set({ enable: false });
    hammer.add(new Hammer.Tap());
    hammer.on('tap', function() {
        counter++;
    });

    stop();

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        start();
        equal(counter, 0);
    }, 100);
});

asyncTest('disabling manager mid-gesture cancels pending timers and resets active recognizers', function() {
    expect(3);

    var pressCount = 0;
    var panEvents = [];
    hammer.add([
        new Hammer.Pan({threshold: 5}),
        new Hammer.Press({time: 30})
    ]);
    hammer.on('press', function() {
        pressCount++;
    });
    hammer.on('panstart panmove panend', function(ev) {
        panEvents.push(ev.type);
    });

    // 1. Start press timer, then disable manager before timer fires
    utils.dispatchTouchEvent(el, 'start', 50, 50);
    hammer.set({enable: false});

    // 2. Re-enable, begin a pan, disable mid-pan (swallowing touchend), then re-enable and pan again
    setTimeout(function() {
        equal(pressCount, 0, 'pending press timer cancelled when manager is disabled via set({enable: false})');

        hammer.set({enable: true});
        utils.dispatchTouchEvent(el, 'start', 10, 10);
        utils.dispatchTouchEvent(el, 'move', 30, 10);
        deepEqual(panEvents, ['panstart'], 'first pan starts normally');

        hammer.set({enable: false});
        utils.dispatchTouchEvent(el, 'end', 30, 10);

        panEvents = [];
        hammer.set({enable: true});
        utils.dispatchTouchEvent(el, 'start', 10, 10);
        utils.dispatchTouchEvent(el, 'move', 30, 10);
        utils.dispatchTouchEvent(el, 'end', 30, 10);
        deepEqual(panEvents, ['panstart', 'panend'], 'pan recognizer resets cleanly so next gesture emits panstart');
        start();
    }, 60);
});

test('should toggle a recognizer using the `set` call to the recognizer enable property', function() {
    expect(2);

    hammer.add(new Hammer.Tap());
    hammer.on('tap', function() {
        counter++;
    });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    equal(counter, 1);

    hammer.get('tap').set({ enable: false });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    equal(counter, 1);
});

test('should accept the `enable` constructor parameter as function', function() {
    expect(2);

    var canRecognizeTap = false;

    var tap = new Hammer.Tap({
        enable: function() {
            return canRecognizeTap;
        }
    });

    hammer.add(tap);
    hammer.on('tap', function() {
        counter++;
    });

    stop();
    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        start();
        equal(counter, 0);

        canRecognizeTap = true;

        utils.dispatchTouchEvent(el, 'start', 50, 50);
        utils.dispatchTouchEvent(el, 'end', 50, 50);

        equal(counter, 1);
    }, 100);
});

test('should accept a function parameter with `set`', function() {
    expect(3);

    hammer.add(new Hammer.Tap());
    hammer.on('tap', function() {
        counter++;
    });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    equal(counter, 1);

    var canRecognizeTap = false;
    hammer.get('tap').set({ enable: function() {
        return canRecognizeTap;
    }});

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    equal(counter, 1);

    canRecognizeTap = true;
    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    equal(counter, 2);
});

test('should pass the recognizer and optional the input parameter to the `enable` callback', function() {
    expect(2);

    var tap;

    // the enable function is called initially to setup the touch-action property
    // at that moment there isnt any input
    var canEnable = function(recognizer, input) {
        equal(recognizer, tap);
        return true;
    };
    tap = new Hammer.Tap({enable: canEnable});
    hammer.add(tap);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
});

test('should toggle based on other object method', function() {
    expect(2);

    var view = {
        state: 0,
        canRecognizeTap: function(recognizer, input) {
            return this.state !== 0;
        }
    };

    hammer.add(new Hammer.Tap({enable: function(rec, input) { return view.canRecognizeTap(rec, input); } }));
    hammer.on('tap', function() {
        counter++;
    });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    equal(counter, 0);

    view.state = 1;
    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    equal(counter, 1);
});

test('Manager.set updates cssProps on element and restores previous styles cleanly', function() {
    var userSelectProp = $H.prefixed(el.style, 'userSelect');
    var origUserSelect = 'text';
    if (userSelectProp) {
        hammer.destroy();
        el.style[userSelectProp] = origUserSelect;
        hammer = new Hammer.Manager(el, {recognizers: []});
        equal(el.style[userSelectProp], 'none', 'initial cssProps applies userSelect: none');

        hammer.set({cssProps: {userSelect: 'auto'}});
        equal(el.style[userSelectProp], 'auto', 'set({cssProps}) applies new userSelect value');

        hammer.set({cssProps: {}});
        equal(el.style[userSelectProp], origUserSelect, 'set({cssProps: {}}) restores original userSelect value');
    } else {
        ok(true, 'userSelect style not supported in environment');
    }
});

test('destroying manager inside a gesture handler does not re-attach session.prevInput', function() {
    expect(2);

    hammer.add(new Hammer.Tap());
    hammer.on('tap', function() {
        hammer.destroy();
    });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    strictEqual(hammer.element, null, 'manager.element is cleared after destroy');
    strictEqual(hammer.session.prevInput, undefined, 'manager.session.prevInput is not re-attached after destroy');
});

test('statically disabled recognizer exits without reading or cloning inputData properties', function() {
    expect(2);

    var getterReads = 0;
    var input = {};
    Object.defineProperty(input, 'distance', {
        enumerable: true,
        get: function() {
            getterReads++;
            return 20;
        }
    });

    var pan = new Hammer.Pan({enable: false});
    hammer.add(pan);
    pan.recognize(input);

    equal(pan.state, $H.STATE_FAILED, 'disabled recognizer transitions to STATE_FAILED');
    equal(getterReads, 0, 'inputData was not cloned while enable is false');
});
