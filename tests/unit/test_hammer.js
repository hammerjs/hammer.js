var el, el2,
    hammer, hammer2;

QUnit.module('Tests', {
    beforeEach: function() {
        el = utils.createHitArea();
        el2 = utils.createHitArea();
    },

    afterEach: function() {
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

QUnit.test('hammer shortcut', function(assert) {
    assert.expect(2);

    var origTouchAction = Hammer.defaults.touchAction;
    Hammer.defaults.touchAction = 'pan-y';
    try {
        hammer = Hammer(el);

        assert.ok(hammer instanceof Hammer.Manager, 'returns an instance of Manager');
        assert.ok(hammer.touchAction.actions == Hammer.defaults.touchAction, 'set the default touchAction');
    } finally {
        Hammer.defaults.touchAction = origTouchAction;
    }
});

QUnit.test('hammer shortcut with options', function(assert) {
    assert.expect(2);

    hammer = Hammer(el, {
        touchAction: 'none'
    });
    assert.ok(hammer instanceof Hammer.Manager, 'returns an instance of Manager');
    assert.ok(hammer.touchAction.actions == 'none', 'set the default touchAction');
});

/* Creating a hammer instance does not work on the same way
 * when using Hammer or Hammer.Manager.
 *
 * This can confuse developers who read tests to use the library when doc is missing.
 */
QUnit.test('Hammer and Hammer.Manager constructors work exactly on the same way.', function(assert) {
    assert.expect(2);

    hammer = new Hammer(el, {});
    assert.equal(Hammer.defaults.preset.length, hammer.recognizers.length);

    hammer2 = new Hammer.Manager(el, {});
    assert.equal(0, hammer2.recognizers.length);
});

/* DOC to disable default recognizers should be added.
 *
 * - Hammer(el).      IMO: Currently, well done.
 * - Hammer(el, {}) . IMO: should disable default recognizers
 * - Hammer(el, {recognizers: null}).      IMO: now, it fails.
 * - Hammer(el, {recognizers: []}).  It works, but it is likely not intuitive.
 */
QUnit.test('A Hammer instance can be setup to not having default recognizers.', function(assert) {
    assert.expect(1);

    hammer = new Hammer(el, { recognizers: false });
    assert.equal(0, hammer.recognizers.length);
});

/* The case was when I added a custom tap event which was added to the default
 * recognizers, and my custom tap gesture wasn't working (I do not know exactly the reason),
 * but removing the default recognizers solved the issue.
 */
QUnit.test('Adding the same recognizer type should remove the old recognizer', function(assert) {
    assert.expect(4);

    hammer = new Hammer(el);

    assert.ok(!!hammer.get('tap'));
    assert.equal(7, hammer.recognizers.length);

    var newTap = new Hammer.Tap({time: 1337});
    hammer.add(newTap);

    assert.equal(7, hammer.recognizers.length);
    assert.equal(1337, hammer.get('tap').options.time);
});

/*
 * Swipe gesture:
 * - in this tests, it does not update input.velocity ( always 0)
 * - does not fire swipeleft or swiperight events
 */
QUnit.test('Swiping to the left should fire swipeleft event', function(assert) {
    var done = assert.async();
    assert.expect(2);

    hammer = new Hammer(el, {recognizers: []});
    hammer.add(new Hammer.Swipe());
    hammer.on('swipe swipeleft', function() {
        assert.ok(true);
    });

    Simulator.gestures.swipe(el, {pos: [300, 300], duration: 60, deltaY: 0, deltaX: -200}, function() {
        done();
    });
});

/*
 * Input target change
 */
QUnit.test('Should detect input while on other element', function(assert) {
    var done = assert.async();
    assert.expect(1);

    hammer = new Hammer(el, { inputTarget: document.body });
    hammer.on('tap', function() {
        assert.ok(true);
    });

    Simulator.gestures.tap(document.body, { duration: 20 }, function() {
        done();
    });
});

/* Hammer.Manager constructor accepts a "recognizers" option in which each
 * element is an array representation of a Recognizer.
 */
QUnit.test('Hammer.Manager accepts recognizers as arrays.', function(assert) {
    assert.expect(4);

    hammer = new Hammer.Manager(el, {
        recognizers: [
            [Hammer.Swipe],
            [Hammer.Pinch],
            [Hammer.Rotate],
            [Hammer.Pan, { direction: Hammer.DIRECTION_UP }, ['swipe', 'pinch'], ['rotate']]
        ]
    });
    assert.equal(4, hammer.recognizers.length);

    var recognizerActual = hammer.recognizers[3];
    assert.equal(recognizerActual.options.direction, Hammer.DIRECTION_UP);
    assert.equal(2, Object.keys(recognizerActual.simultaneous).length);
    assert.equal(1, recognizerActual.requireFail.length);
});

QUnit.test('Manager constructor wires forward recognizer references and clones options.cssProps', function(assert) {
    assert.expect(4);

    // 1. Forward references in options.recognizers (doubletap listed before tap and press)
    hammer = new Hammer.Manager(el, {
        recognizers: [
            [Hammer.Tap, {event: 'doubletap', taps: 2}, ['tap'], ['press']],
            [Hammer.Tap],
            [Hammer.Press]
        ]
    });
    var doubletap = hammer.get('doubletap');
    var tap = hammer.get('tap');
    var press = hammer.get('press');
    assert.equal(doubletap.canRecognizeWith(tap), true, 'forward recognizeWith reference resolved');
    assert.equal(doubletap.requireFail[0], press, 'forward requireFailure reference resolved');

    // 2. options.cssProps is cloned and does not alias Hammer.defaults.cssProps
    assert.notStrictEqual(hammer.options.cssProps, Hammer.defaults.cssProps, 'manager.options.cssProps does not alias Hammer.defaults.cssProps');
    var origUserSelect = Hammer.defaults.cssProps.userSelect;
    hammer.options.cssProps.userSelect = 'text';
    assert.equal(Hammer.defaults.cssProps.userSelect, origUserSelect, 'mutating manager.options.cssProps does not mutate Hammer.defaults.cssProps');
});

/*
 * Removing a recognizer which cannot be found would errantly remove the last recognizer in the
 * manager's list.
 */
QUnit.test('Remove non-existent recognizer.', function(assert) {
    assert.expect(1);

    hammer = new Hammer(el, {recognizers: []});
    hammer.add(new Hammer.Swipe());
    hammer.remove('tap');

    assert.equal(1, hammer.recognizers.length);
});

QUnit.test('check whether Hammer.defaults.cssProps is restored', function(assert) {
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
            assert.equal(el.style[prop], beforeCssProps[name], "check if " + name + " is restored");
        }
    });
});

QUnit.test('TouchMouseInput ignores mouse events with srcEvent.sourceCapabilities.firesTouchEvents', function(assert) {
    assert.expect(2);

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
    assert.equal(tapCount, 0, 'mouse event with firesTouchEvents=true is ignored');

    dispatchMouse('mousedown', 100, 100, 1, false);
    dispatchMouse('mouseup', 100, 100, 0, false);
    assert.equal(tapCount, 1, 'mouse event with firesTouchEvents=false is still recognized');
});

QUnit.test('TouchAction skips preventDefault on non-cancelable events', function(assert) {
    assert.expect(5);

    hammer = new Hammer(el, {touchAction: 'none'});
    var preventCalls = 0;
    var nonCancelableEvent = {
        cancelable: false,
        preventDefault: function() {
            preventCalls++;
        }
    };

    hammer.touchAction.preventSrc(nonCancelableEvent);
    assert.equal(preventCalls, 0, 'preventSrc skips preventDefault when cancelable is false');
    assert.ok(!hammer.session.prevented, 'session.prevented is not set when event is non-cancelable');

    hammer.session.prevented = true;
    hammer.touchAction.preventDefaults({
        pointers: [{clientX: 80, clientY: 50}],
        distance: 30,
        deltaTime: 300,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        srcEvent: nonCancelableEvent
    });
    assert.equal(preventCalls, 0, 'preventDefaults skips preventDefault when cancelable is false');

    hammer.session.prevented = false;
    hammer.touchAction.preventSrc({
        cancelable: true,
        preventDefault: function() {
            preventCalls++;
        }
    });
    assert.equal(preventCalls, 1, 'preventSrc calls preventDefault when cancelable is true');

    hammer.touchAction.preventSrc({
        preventDefault: function() {
            preventCalls++;
        }
    });
    assert.equal(preventCalls, 2, 'preventSrc still calls preventDefault when cancelable is undefined');
});

QUnit.test('toggleCssProps does not write undefined property for unsupported cssProps', function(assert) {
    assert.expect(3);

    hammer = Hammer(el, {
        cssProps: {
            unsupportedFakeCssProp: 'none'
        }
    });

    assert.ok(!('undefined' in el.style), 'element.style does not get an "undefined" property');
    assert.ok(!('undefined' in hammer.oldCssProps), 'oldCssProps does not store an "undefined" key');

    hammer.destroy();
    hammer = null;

    assert.ok(!('undefined' in el.style), 'element.style still has no "undefined" property after destroy');
});

QUnit.test('PointerEventInput snapshots pointers and removes ended pointer before callback', function(assert) {
    assert.expect(4);

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
    assert.equal(capturedPointers && capturedPointers.length, 1, 'ev.pointers snapshot is not mutated after pointerup');

    shouldThrow = true;
    var caught = false;
    hammer.input.handler(createPointerEvent('pointerdown', 2));
    try {
        hammer.input.handler(createPointerEvent('pointerup', 2));
    } catch (err) {
        caught = true;
    }
    assert.ok(caught, 'listener error propagated synchronously');
    assert.equal(hammer.input.store.length, 0, 'store is cleaned up even when a listener throws');

    shouldThrow = false;
    hammer.input.handler(createPointerEvent('pointerdown', 3));
    hammer.input.handler(createPointerEvent('pointerup', 3));
    assert.equal(tapCount, 3, 'subsequent gestures still recognize after listener throw');
});

QUnit.test('Manager.destroy clears DOM references and is safe to call twice', function(assert) {
    assert.expect(4);

    hammer = new Hammer(el, {inputTarget: el2});
    hammer.destroy();

    assert.strictEqual(hammer.element, null, 'destroy clears manager.element');
    assert.strictEqual(hammer.input, null, 'destroy clears manager.input');
    assert.strictEqual(hammer.options.inputTarget, null, 'destroy clears manager.options.inputTarget');

    hammer.destroy();
    assert.ok(true, 'calling destroy a second time does not throw');
    hammer = null;
});

QUnit.test('Manager.remove and Manager.destroy reset pending timers, halt active recognition, and guard touchAction', function(assert) {
    var done = assert.async();
    assert.expect(5);

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
    assert.strictEqual(press.manager, null, 'remove() clears recognizer.manager');

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

    assert.equal(pan2Fired, 0, 'destroy() inside a listener halts remaining recognizers in the active cycle');

    // 3. Updating touchAction / recognizer options after destroy does not throw
    press2.set({enable: false});
    assert.ok(true, 'recognizer.set() -> touchAction.update() after destroy() does not throw');

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
    assert.equal(pan2Fired, 0, 'recognize() after destroy() is ignored');

    hammer = null;
    setTimeout(function() {
        assert.equal(pressFired, 0, 'pending press timers were cancelled by remove() and destroy()');
        done();
    }, 60);
});

QUnit.test('Hammer() does not mutate caller options and accepts frozen options objects', function(assert) {
    assert.expect(3);

    var sharedOptions = {touchAction: 'pan-y'};
    var h1 = new Hammer(el, sharedOptions);
    assert.strictEqual(sharedOptions.recognizers, undefined, 'caller options object is not mutated with default recognizers');
    h1.destroy();

    var frozenOptions = Object.freeze({touchAction: 'pan-y'});
    var h2 = new Hammer(el, frozenOptions);
    assert.ok(h2.recognizers.length > 0, 'frozen options object works and still attaches default preset recognizers');
    assert.equal(h2.options.touchAction, 'pan-y', 'frozen option values are preserved');
    h2.destroy();
});

QUnit.test('disabling manager mid-gesture resets active input state and guards set(inputTarget) after destroy', function(assert) {
    assert.expect(5);

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
    assert.equal(hammer.input.store.length, 1, 'pointer stored while enabled');

    enabled = false;
    hammer.input.domHandler({type: 'pointerup', pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0, clientX: 10, clientY: 10, target: el});
    assert.equal(hammer.input.store.length, 0, 'store cleared when domHandler observes manager disabled');

    // Re-enabling and hovering must not emit a ghost tap
    enabled = true;
    hammer.input.domHandler({type: 'pointermove', pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0, clientX: 10, clientY: 10, target: el});
    assert.equal(tapCount, 0, 'hovering after re-enable does not emit a ghost tap');

    // Static set({enable: false}) clears active store immediately
    hammer.input.domHandler({type: 'pointerdown', pointerId: 2, pointerType: 'touch', button: 0, clientX: 10, clientY: 10, target: el});
    hammer.set({enable: false});
    assert.equal(hammer.input.store.length, 0, 'set({enable: false}) resets input store immediately');

    // set({inputTarget}) after destroy does not throw
    hammer.destroy();
    hammer.set({inputTarget: el2});
    assert.ok(true, 'set({inputTarget}) safely ignored after destroy');
    hammer = null;
});

QUnit.test('Manager.remove clears session.curRecognizer when removing active recognizer mid-gesture', function(assert) {
    assert.expect(5);

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
    assert.strictEqual(hammer.session.curRecognizer.options.event, 'pan1', 'pan1 becomes curRecognizer on start');

    utils.dispatchTouchEvent(el, 'move', 40, 10);
    assert.equal(pan2Started, 1, 'removing active pan1 on pan1move clears curRecognizer and lets pan2 recognize');
    assert.strictEqual(hammer.session.curRecognizer.options.event, 'pan2', 'pan2 becomes new curRecognizer');

    // 2. toggleCssProps safely handles null element (e.g. set({cssProps}) after destroy)
    hammer.destroy();
    hammer.set({cssProps: {userSelect: 'text'}});
    assert.ok(true, 'set({cssProps}) after destroy() does not throw');
    $H.toggleCssProps({element: null, options: {cssProps: {userSelect: 'none'}}, oldCssProps: {}}, true);
    assert.ok(true, 'toggleCssProps safely ignores null element');
    hammer = null;
});

QUnit.test('Manager.recognize does not loop infinitely when a handler replaces the active recognizer with add()', function(assert) {
    assert.expect(2);

    hammer = new Hammer.Manager(el, {
        recognizers: [[Hammer.Tap]]
    });

    var tapCount = 0;
    hammer.on('tap', function() {
        tapCount++;
        if (tapCount < 5) {
            hammer.add(new Hammer.Tap());
        }
    });

    utils.dispatchTouchEvent(el, 'start', 20, 20);
    utils.dispatchTouchEvent(el, 'end', 20, 20);
    assert.equal(tapCount, 1, 'replacing active recognizer via add() inside handler runs once without looping');

    // Removing a subsequent recognizer inside an earlier recognizer callback skips the removed recognizer
    hammer.destroy();
    var secondFired = 0;
    hammer = new Hammer.Manager(el, {
        recognizers: [
            [Hammer.Tap, {event: 'tap1'}],
            [Hammer.Tap, {event: 'tap2'}, ['tap1']]
        ]
    });
    hammer.on('tap1', function() {
        hammer.remove('tap2');
    });
    hammer.on('tap2', function() {
        secondFired++;
    });

    utils.dispatchTouchEvent(el, 'start', 20, 20);
    utils.dispatchTouchEvent(el, 'end', 20, 20);
    assert.equal(secondFired, 0, 'recognizer removed earlier in the same recognize() cycle is skipped');
});

QUnit.test('Manager.emit stops DOM dispatch after destroy() and Recognizer.emit stops after remove()', function(assert) {
    assert.expect(2);

    // 1. Calling destroy() inside a DOM panstart listener stops subsequent pan/panright DOM events
    var domEventsSeen = [];
    hammer = new Hammer.Manager(el, {
        domEvents: true,
        recognizers: [[Hammer.Pan, {threshold: 5}]]
    });

    var onDomEvent = function(ev) {
        domEventsSeen.push(ev.type);
        if (ev.type === 'panstart') {
            hammer.destroy();
        }
    };
    ['panstart', 'pan', 'panright'].forEach(function(name) {
        el.addEventListener(name, onDomEvent, false);
    });

    try {
        utils.dispatchTouchEvent(el, 'start', 10, 10);
        utils.dispatchTouchEvent(el, 'move', 30, 10);
        assert.deepEqual(domEventsSeen, ['panstart'], 'no further DOM events dispatched after destroy() in panstart listener');
    } finally {
        ['panstart', 'pan', 'panright'].forEach(function(name) {
            el.removeEventListener(name, onDomEvent, false);
        });
        hammer = null;
    }

    // 2. Calling remove() inside a panstart listener stops subsequent pan/panright emits
    var emitted = [];
    hammer = new Hammer.Manager(el, {
        recognizers: [[Hammer.Pan, {threshold: 5}]]
    });
    hammer.on('panstart pan panright', function(ev) {
        emitted.push(ev.type);
        if (ev.type === 'panstart') {
            hammer.remove('pan');
        }
    });

    utils.dispatchTouchEvent(el, 'start', 10, 10);
    utils.dispatchTouchEvent(el, 'move', 30, 10);
    assert.deepEqual(emitted, ['panstart'], 'Recognizer.emit stops emitting remaining events after manager.remove()');
});

QUnit.test('Manager constructor skips displaced preset recognizers and unattached string refs are ignored', function(assert) {
    assert.expect(5);

    // 1. Displaced recognizer in options.recognizers must not wire recognizeWith/requireFailure
    hammer = new Hammer.Manager(el, {
        recognizers: [
            [Hammer.Tap, {event: 'tap', time: 100}, ['pan'], ['press']],
            [Hammer.Tap, {event: 'tap', time: 500}],
            [Hammer.Pan],
            [Hammer.Press]
        ]
    });
    var tap = hammer.get('tap');
    var pan = hammer.get('pan');
    assert.equal(tap.options.time, 500, 'later preset entry replaces earlier entry with same event name');
    assert.equal(Object.keys(pan.simultaneous).length, 0, 'displaced recognizer did not pollute pan.simultaneous');
    assert.equal(tap.requireFail.length, 0, 'replacement recognizer kept its own requireFail list');

    // 2. Unattached recognizer ignores string recognizeWith / requireFailure
    var orphan = new Hammer.Tap();
    orphan.recognizeWith('pan');
    orphan.requireFailure('press');
    assert.equal(Object.keys(orphan.simultaneous).length, 0, 'unattached recognizeWith(string) does not add undefined key');
    assert.equal(orphan.requireFail.length, 0, 'unattached requireFailure(string) does not push raw string');
});

QUnit.test('Manager.set handles cssProps disabling/cloning, inputTarget reset, and destroy stops remaining handlers', function(assert) {
    assert.expect(9);

    var prop = Hammer.prefixed(el.style, 'userSelect');
    if (prop) {
        el.style[prop] = 'text';
    }

    var customCss = {userSelect: 'none'};
    hammer = new Hammer.Manager(el, {
        cssProps: customCss,
        recognizers: [[Hammer.Press, {time: 20}], [Hammer.Tap]]
    });

    // 1. set({cssProps}) clones caller object and restores on false/null
    var updatedCss = {userSelect: 'all'};
    hammer.set({cssProps: updatedCss});
    assert.notStrictEqual(hammer.options.cssProps, updatedCss, 'set({cssProps}) clones caller object');
    updatedCss.userSelect = 'auto';
    assert.equal(hammer.options.cssProps.userSelect, 'all', 'mutating caller cssProps object does not mutate manager.options.cssProps');

    hammer.set({cssProps: false});
    assert.equal(hammer.options.cssProps, false, 'set({cssProps: false}) updates option');
    if (prop) {
        assert.equal(el.style[prop], 'text', 'set({cssProps: false}) restores original CSS property');
    } else {
        assert.ok(true, 'userSelect not prefixed in environment');
    }

    // 2. set({inputTarget}) stops active session and falsy inputTarget reverts to element
    hammer.set({inputTarget: el2});
    assert.strictEqual(hammer.input.target, el2, 'set({inputTarget: el2}) rebinds input target');
    hammer.set({inputTarget: null});
    assert.strictEqual(hammer.options.inputTarget, el, 'set({inputTarget: null}) reverts option to manager.element');
    assert.strictEqual(hammer.input.target, el, 'set({inputTarget: null}) rebinds input target to manager.element');

    // 3. destroy() inside a JS listener halts remaining listeners and detaches recognizers
    var tapRec = hammer.get('tap');
    var secondCalled = 0;
    hammer.on('tap', function() {
        hammer.destroy();
    });
    hammer.on('tap', function() {
        secondCalled++;
    });

    utils.dispatchTouchEvent(el, 'start', 20, 20);
    utils.dispatchTouchEvent(el, 'end', 20, 20);

    assert.equal(secondCalled, 0, 'Manager.emit stops invoking remaining JS listeners after destroy()');
    assert.strictEqual(tapRec.manager, null, 'Manager.destroy detaches recognizers and clears recognizer.manager');
    hammer = null;
});
