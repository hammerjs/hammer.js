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

    Hammer.defaults.touchAction = 'pan-y';
    hammer = Hammer(el);

    ok(hammer instanceof Hammer.Manager, 'returns an instance of Manager');
    ok(hammer.touchAction.actions == Hammer.defaults.touchAction, 'set the default touchAction');
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

test('PointerEventInput snapshots pointers and removes ended pointer before callback', function() {
    expect(3);

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

    function dispatchPointer(type, id) {
        var ev = document.createEvent('Event');
        ev.initEvent(type, true, true);
        ev.clientX = 50;
        ev.clientY = 50;
        ev.pointerId = id;
        ev.pointerType = 'mouse';
        ev.button = 0;
        (type === 'pointerdown' ? el : window).dispatchEvent(ev);
    }

    dispatchPointer('pointerdown', 1);
    dispatchPointer('pointerup', 1);
    equal(capturedPointers && capturedPointers.length, 1, 'ev.pointers snapshot is not mutated after pointerup');

    shouldThrow = true;
    dispatchPointer('pointerdown', 2);
    try {
        dispatchPointer('pointerup', 2);
    } catch (err) {
        // expected listener throw
    }
    equal(hammer.input.store.length, 0, 'store is cleaned up even when a listener throws');

    shouldThrow = false;
    dispatchPointer('pointerdown', 3);
    dispatchPointer('pointerup', 3);
    equal(tapCount, 3, 'subsequent gestures still recognize after listener throw');
});
