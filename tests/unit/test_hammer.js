var el, el2,
    hammer, hammer2;

module('Tests', {
    setup: function() {
        el = utils.createHitArea();
        el2 = utils.createHitArea();
    },

    teardown: function() {
        if (hammer) {
            hammer.destroy();
            hammer = null;
        }
        if (hammer2) {
            hammer2.destroy();
            hammer2 = null;
        }
    }
});

test('hammer shortcut', function() {
    expect(2);

    var origTouchAction = Hammer.defaults.touchAction;
    Hammer.defaults.touchAction = 'pan-y';
    try {
        hammer = Hammer(el);

        ok(hammer instanceof Hammer.Manager, 'returns an instance of Manager');
        ok(hammer.touchAction.actions == Hammer.defaults.touchAction, 'set the default touchAction');
    } finally {
        Hammer.defaults.touchAction = origTouchAction;
    }
});

test('hammer shortcut with options', function() {
    expect(2);

    hammer = Hammer(el, {
        touchAction: 'none'
    });
    ok(hammer instanceof Hammer.Manager, 'returns an instance of Manager');
    ok(hammer.touchAction.actions == 'none', 'set the default touchAction');
});

/* Creating a hammer instance does not work on the same way
 * when using Hammer or Hammer.Manager.
 *
 * This can confuse developers who read tests to use the library when doc is missing.
 */
test('Hammer and Hammer.Manager constructors work exactly on the same way.', function() {
    expect(2);

    hammer = new Hammer(el, {});
    equal(Hammer.defaults.preset.length, hammer.recognizers.length);

    hammer2 = new Hammer.Manager(el, {});
    equal(0, hammer2.recognizers.length);
});

/* DOC to disable default recognizers should be added.
 *
 * - Hammer(el).      IMO: Currently, well done.
 * - Hammer(el, {}) . IMO: should disable default recognizers
 * - Hammer(el, {recognizers: null}).      IMO: now, it fails.
 * - Hammer(el, {recognizers: []}).  It works, but it is likely not intuitive.
 */
test('A Hammer instance can be setup to not having default recognizers.', function() {
    expect(1);

    hammer = new Hammer(el, { recognizers: false });
    equal(0, hammer.recognizers.length);
});

/* The case was when I added a custom tap event which was added to the default
 * recognizers, and my custom tap gesture wasn't working (I do not know exactly the reason),
 * but removing the default recognizers solved the issue.
 */
test('Adding the same recognizer type should remove the old recognizer', function() {
    expect(4);

    hammer = new Hammer(el);

    ok(!!hammer.get('tap'));
    equal(7, hammer.recognizers.length);

    var newTap = new Hammer.Tap({time: 1337});
    hammer.add(newTap);

    equal(7, hammer.recognizers.length);
    equal(1337, hammer.get('tap').options.time);
});

/*
 * Swipe gesture:
 * - in this tests, it does not update input.velocity ( always 0)
 * - does not fire swipeleft or swiperight events
 */
asyncTest('Swiping to the left should fire swipeleft event', function() {
    expect(2);

    hammer = new Hammer(el, {recognizers: []});
    hammer.add(new Hammer.Swipe());
    hammer.on('swipe swipeleft', function() {
        ok(true);
    });

    Simulator.gestures.swipe(el, {pos: [300, 300], deltaY: 0, deltaX: -200}, function() {
        start();
    });
});

/*
 * Input target change
 */
asyncTest('Should detect input while on other element', function() {
    expect(1);

    hammer = new Hammer(el, { inputTarget: document.body });
    hammer.on('tap', function() {
        ok(true);
    });

    Simulator.gestures.tap(document.body, null, function() {
        start();
    });
});

/* Hammer.Manager constructor accepts a "recognizers" option in which each
 * element is an array representation of a Recognizer.
 */
test('Hammer.Manager accepts recognizers as arrays.', function() {
    expect(4);

    hammer = new Hammer.Manager(el, {
        recognizers: [
            [Hammer.Swipe],
            [Hammer.Pinch],
            [Hammer.Rotate],
            [Hammer.Pan, { direction: Hammer.DIRECTION_UP }, ['swipe', 'pinch'], ['rotate']]
        ]
    });
    equal(4, hammer.recognizers.length);

    var recognizerActual = hammer.recognizers[3];
    equal(recognizerActual.options.direction, Hammer.DIRECTION_UP);
    equal(2, Object.keys(recognizerActual.simultaneous).length);
    equal(1, recognizerActual.requireFail.length);
});

/*
 * Removing a recognizer which cannot be found would errantly remove the last recognizer in the
 * manager's list.
 */
test('Remove non-existent recognizer.', function() {
    expect(1);

    hammer = new Hammer(el, {recognizers: []});
    hammer.add(new Hammer.Swipe());
    hammer.remove('tap');

    equal(1, hammer.recognizers.length);
});

test('check whether Hammer.defaults.cssProps is restored', function() {
    var beforeCssProps = {
        userSelect: 'text',
        touchSelect: 'grippers',
        touchCallout: 'default',
        contentZooming: 'chained',
        userDrag: 'element',
        tapHighlightColor: 'rgba(0, 1, 0, 0)'
    };
    var prop;
    Hammer.each(Hammer.defaults.cssProps, function(value, name) {
        prop = Hammer.prefixed(el.style, name);
        if (prop) {
            el.style[prop] = beforeCssProps[name];
        }
    });

    hammer = Hammer(el);
    hammer.destroy();
    hammer = null;
    Hammer.each(Hammer.defaults.cssProps, function(value, name) {
        prop = Hammer.prefixed(el.style, name);
        if (prop) {
            equal(el.style[prop], beforeCssProps[name], "check if " + name + " is restored");
        }
    });
});

test('TouchMouseInput ignores mouse events with srcEvent.sourceCapabilities.firesTouchEvents', function() {
    expect(2);

    hammer = new Hammer(el, {inputClass: Hammer.TouchMouseInput});
    var tapCount = 0;
    hammer.on('tap', function() {
        tapCount++;
    });

    function dispatchMouse(type, x, y, which, firesTouchEvents) {
        var ev = document.createEvent('Event');
        ev.initEvent(type, true, true);
        ev.clientX = x;
        ev.clientY = y;
        ev.button = 0;
        ev.which = which;
        ev.sourceCapabilities = {firesTouchEvents: firesTouchEvents};
        (type === 'mousedown' ? el : window).dispatchEvent(ev);
    }

    dispatchMouse('mousedown', 50, 50, 1, true);
    dispatchMouse('mouseup', 50, 50, 0, true);
    equal(tapCount, 0, 'mouse event with firesTouchEvents=true is ignored');

    dispatchMouse('mousedown', 100, 100, 1, false);
    dispatchMouse('mouseup', 100, 100, 0, false);
    equal(tapCount, 1, 'mouse event with firesTouchEvents=false is still recognized');
});

test('TouchAction skips preventDefault on non-cancelable events', function() {
    expect(5);

    hammer = new Hammer(el, {touchAction: 'none'});
    var preventCalls = 0;
    var nonCancelableEvent = {
        cancelable: false,
        preventDefault: function() {
            preventCalls++;
        }
    };

    hammer.touchAction.preventSrc(nonCancelableEvent);
    equal(preventCalls, 0, 'preventSrc skips preventDefault when cancelable is false');
    ok(!hammer.session.prevented, 'session.prevented is not set when event is non-cancelable');

    hammer.session.prevented = true;
    hammer.touchAction.preventDefaults({
        pointers: [{clientX: 80, clientY: 50}],
        distance: 30,
        deltaTime: 300,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        srcEvent: nonCancelableEvent
    });
    equal(preventCalls, 0, 'preventDefaults skips preventDefault when cancelable is false');

    hammer.session.prevented = false;
    hammer.touchAction.preventSrc({
        cancelable: true,
        preventDefault: function() {
            preventCalls++;
        }
    });
    equal(preventCalls, 1, 'preventSrc calls preventDefault when cancelable is true');

    hammer.touchAction.preventSrc({
        preventDefault: function() {
            preventCalls++;
        }
    });
    equal(preventCalls, 2, 'preventSrc still calls preventDefault when cancelable is undefined');
});

test('toggleCssProps does not write undefined property for unsupported cssProps', function() {
    expect(3);

    hammer = Hammer(el, {
        cssProps: {
            unsupportedFakeCssProp: 'none'
        }
    });

    ok(!('undefined' in el.style), 'element.style does not get an "undefined" property');
    ok(!('undefined' in hammer.oldCssProps), 'oldCssProps does not store an "undefined" key');

    hammer.destroy();
    hammer = null;

    ok(!('undefined' in el.style), 'element.style still has no "undefined" property after destroy');
});

test('PointerEventInput snapshots pointers and removes ended pointer before callback', function() {
    expect(4);

    hammer = new Hammer(el, {inputClass: Hammer.PointerEventInput});
    var capturedPointers = null;
    var shouldThrow = false;
    var tapCount = 0;

    hammer.on('tap', function(ev) {
        capturedPointers = ev.pointers;
        tapCount++;
        if (shouldThrow) {
            throw new Error('listener failure');
        }
    });

    function createPointerEvent(type, id) {
        var ev = document.createEvent('Event');
        ev.initEvent(type, true, true);
        ev.clientX = 50;
        ev.clientY = 50;
        ev.pointerId = id;
        ev.pointerType = 'mouse';
        ev.button = 0;
        return ev;
    }

    hammer.input.handler(createPointerEvent('pointerdown', 1));
    hammer.input.handler(createPointerEvent('pointerup', 1));
    equal(capturedPointers && capturedPointers.length, 1, 'ev.pointers snapshot is not mutated after pointerup');

    shouldThrow = true;
    var caught = false;
    hammer.input.handler(createPointerEvent('pointerdown', 2));
    try {
        hammer.input.handler(createPointerEvent('pointerup', 2));
    } catch (err) {
        caught = true;
    }
    ok(caught, 'listener error propagated synchronously');
    equal(hammer.input.store.length, 0, 'store is cleaned up even when a listener throws');

    shouldThrow = false;
    hammer.input.handler(createPointerEvent('pointerdown', 3));
    hammer.input.handler(createPointerEvent('pointerup', 3));
    equal(tapCount, 3, 'subsequent gestures still recognize after listener throw');
});

test('Manager.destroy clears DOM references and is safe to call twice', function() {
    expect(4);

    hammer = new Hammer(el, {inputTarget: el2});
    hammer.destroy();

    strictEqual(hammer.element, null, 'destroy clears manager.element');
    strictEqual(hammer.input, null, 'destroy clears manager.input');
    strictEqual(hammer.options.inputTarget, null, 'destroy clears manager.options.inputTarget');

    hammer.destroy();
    ok(true, 'calling destroy a second time does not throw');
    hammer = null;
});

asyncTest('Manager.remove and Manager.destroy reset pending timers, halt active recognition, and guard touchAction', function() {
    expect(5);

    hammer = new Hammer.Manager(el, {
        domEvents: true,
        recognizers: [
            [Hammer.Press, {time: 20}],
            [Hammer.Pan, {event: 'pan1', threshold: 1}],
            [Hammer.Pan, {event: 'pan2', threshold: 1}, ['pan1']]
        ]
    });

    var press = hammer.get('press');
    var pressFired = 0;
    el.addEventListener('press', function() {
        pressFired++;
    }, false);

    // 1. Removing a recognizer resets its timer and clears recognizer.manager
    utils.dispatchTouchEvent(el, 'start', 50, 50);
    hammer.remove(press);
    strictEqual(press.manager, null, 'remove() clears recognizer.manager');

    // 2. Re-add press, trigger timer, then destroy inside pan1start -> pan2 must not run and press timer must be cancelled
    var press2 = hammer.add(new Hammer.Press({event: 'press', time: 20}));
    var pan2Fired = 0;
    hammer.on('pan1start', function() {
        hammer.destroy();
    });
    hammer.on('pan2start', function() {
        pan2Fired++;
    });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    hammer.recognize({
        eventType: $H.INPUT_MOVE,
        pointers: [{clientX: 70, clientY: 50}],
        changedPointers: [{clientX: 70, clientY: 50}],
        maxPointers: 1,
        distance: 20,
        deltaX: 20,
        deltaY: 0,
        deltaTime: 10,
        direction: Hammer.DIRECTION_RIGHT,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        target: el,
        srcEvent: {cancelable: true, preventDefault: function() {}}
    });

    equal(pan2Fired, 0, 'destroy() inside a listener halts remaining recognizers in the active cycle');

    // 3. Updating touchAction / recognizer options after destroy does not throw
    press2.set({enable: false});
    ok(true, 'recognizer.set() -> touchAction.update() after destroy() does not throw');

    // 4. Subsequent recognize() after destroy is a no-op
    hammer.recognize({
        eventType: $H.INPUT_MOVE,
        pointers: [{clientX: 90, clientY: 50}],
        distance: 40,
        deltaX: 40,
        deltaY: 0,
        direction: Hammer.DIRECTION_RIGHT,
        srcEvent: {cancelable: true, preventDefault: function() {}}
    });
    equal(pan2Fired, 0, 'recognize() after destroy() is ignored');

    hammer = null;
    setTimeout(function() {
        equal(pressFired, 0, 'pending press timers were cancelled by remove() and destroy()');
        start();
    }, 60);
});

test('Hammer() does not mutate caller options and accepts frozen options objects', function() {
    expect(3);

    var sharedOptions = {touchAction: 'pan-y'};
    var h1 = new Hammer(el, sharedOptions);
    strictEqual(sharedOptions.recognizers, undefined, 'caller options object is not mutated with default recognizers');
    h1.destroy();

    var frozenOptions = Object.freeze({touchAction: 'pan-y'});
    var h2 = new Hammer(el, frozenOptions);
    ok(h2.recognizers.length > 0, 'frozen options object works and still attaches default preset recognizers');
    equal(h2.options.touchAction, 'pan-y', 'frozen option values are preserved');
    h2.destroy();
});

test('disabling manager mid-gesture resets active input state and guards set(inputTarget) after destroy', function() {
    expect(5);

    var enabled = true;
    var tapCount = 0;
    hammer = new Hammer.Manager(el, {
        inputClass: Hammer.PointerEventInput,
        enable: function() {
            return enabled;
        },
        recognizers: [[Hammer.Tap]]
    });
    hammer.on('tap', function() {
        tapCount++;
    });

    // Pointer down while enabled, then disabled before pointerup
    hammer.input.domHandler({type: 'pointerdown', pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX: 10, clientY: 10, target: el});
    equal(hammer.input.store.length, 1, 'pointer stored while enabled');

    enabled = false;
    hammer.input.domHandler({type: 'pointerup', pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0, clientX: 10, clientY: 10, target: el});
    equal(hammer.input.store.length, 0, 'store cleared when domHandler observes manager disabled');

    // Re-enabling and hovering must not emit a ghost tap
    enabled = true;
    hammer.input.domHandler({type: 'pointermove', pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0, clientX: 10, clientY: 10, target: el});
    equal(tapCount, 0, 'hovering after re-enable does not emit a ghost tap');

    // Static set({enable: false}) clears active store immediately
    hammer.input.domHandler({type: 'pointerdown', pointerId: 2, pointerType: 'touch', button: 0, clientX: 10, clientY: 10, target: el});
    hammer.set({enable: false});
    equal(hammer.input.store.length, 0, 'set({enable: false}) resets input store immediately');

    // set({inputTarget}) after destroy does not throw
    hammer.destroy();
    hammer.set({inputTarget: el2});
    ok(true, 'set({inputTarget}) safely ignored after destroy');
    hammer = null;
});

test('Manager.remove clears session.curRecognizer when removing active recognizer mid-gesture', function() {
    expect(5);

    // 1. Removing inside pan1move (after pan1 is already stored in session.curRecognizer)
    hammer = new Hammer.Manager(el, {
        recognizers: [
            [Hammer.Pan, {event: 'pan1', threshold: 5}],
            [Hammer.Pan, {event: 'pan2', threshold: 5}]
        ]
    });

    var pan2Started = 0;
    hammer.on('pan1move', function() {
        hammer.remove('pan1');
    });
    hammer.on('pan2start', function() {
        pan2Started++;
    });

    utils.dispatchTouchEvent(el, 'start', 10, 10);
    utils.dispatchTouchEvent(el, 'move', 25, 10);
    strictEqual(hammer.session.curRecognizer.options.event, 'pan1', 'pan1 becomes curRecognizer on start');

    utils.dispatchTouchEvent(el, 'move', 40, 10);
    equal(pan2Started, 1, 'removing active pan1 on pan1move clears curRecognizer and lets pan2 recognize');
    strictEqual(hammer.session.curRecognizer.options.event, 'pan2', 'pan2 becomes new curRecognizer');

    // 2. toggleCssProps safely handles null element (e.g. set({cssProps}) after destroy)
    hammer.destroy();
    hammer.set({cssProps: {userSelect: 'text'}});
    ok(true, 'set({cssProps}) after destroy() does not throw');
    $H.toggleCssProps({element: null, options: {cssProps: {userSelect: 'none'}}, oldCssProps: {}}, true);
    ok(true, 'toggleCssProps safely ignores null element');
    hammer = null;
});
