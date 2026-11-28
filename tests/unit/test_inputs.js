(function() {
    var el, manager;

    QUnit.module('Input Drivers', {
        beforeEach: function() {
            el = utils.createHitArea();
        },
        afterEach: function() {
            if (manager) {
                manager.destroy();
                manager = null;
            }
        }
    });

    QUnit.test('MouseInput handles left-button press, move, release, and lost-button move', function(assert) {
        var calls = [];
        manager = new Hammer.Manager(el, {recognizers: []});
        var input = new $H.MouseInput(manager, function(mgr, type, data) {
            calls.push({type: type, data: data});
        });

        try {
            // Move before mousedown is ignored
            input.handler({type: 'mousemove', button: 0, which: 1, clientX: 10, clientY: 10});
            assert.equal(calls.length, 0, 'mousemove ignored when not pressed');

            // Right-click mousedown is ignored
            input.handler({type: 'mousedown', button: 2, which: 3, clientX: 10, clientY: 10});
            assert.equal(calls.length, 0, 'non-left mousedown ignored');
            assert.equal(input.pressed, false, 'pressed remains false for non-left button');

            // Left-click start -> move -> end
            input.handler({type: 'mousedown', button: 0, which: 1, clientX: 10, clientY: 20});
            input.handler({type: 'mousemove', button: 0, which: 1, clientX: 30, clientY: 40});
            input.handler({type: 'mouseup', button: 0, which: 1, clientX: 30, clientY: 40});

            assert.equal(calls.length, 3, 'start, move, end dispatched');
            assert.equal(calls[0].type, $H.INPUT_START, 'first event is INPUT_START');
            assert.equal(calls[0].data.pointerType, $H.INPUT_TYPE_MOUSE, 'pointerType is mouse');
            assert.equal(calls[1].type, $H.INPUT_MOVE, 'second event is INPUT_MOVE');
            assert.equal(calls[2].type, $H.INPUT_END, 'third event is INPUT_END');
            assert.equal(input.pressed, false, 'pressed reset on mouseup');

            // Move with which !== 1 ends an active press (e.g. released outside window)
            calls = [];
            input.handler({type: 'mousedown', button: 0, which: 1, clientX: 10, clientY: 10});
            input.handler({type: 'mousemove', button: 0, which: 0, clientX: 20, clientY: 20});
            assert.equal(calls.length, 2, 'start and synthetic end dispatched');
            assert.equal(calls[1].type, $H.INPUT_END, 'mousemove with which !== 1 converted to INPUT_END');
            assert.equal(input.pressed, false, 'pressed reset when which !== 1');
        } finally {
            input.destroy();
        }
    });

    QUnit.test('MouseInput accepts standard MouseEvent buttons bitmask when ev.which is 0', function(assert) {
        var calls = [];
        manager = new Hammer.Manager(el, {recognizers: []});
        var input = new $H.MouseInput(manager, function(mgr, type) {
            calls.push(type);
        });

        try {
            // Standard W3C MouseEvent('mousemove', { buttons: 1 }) leaves legacy ev.which === 0
            input.handler({type: 'mousedown', button: 0, buttons: 1, which: 0, clientX: 10, clientY: 10});
            input.handler({type: 'mousemove', button: 0, buttons: 1, which: 0, clientX: 25, clientY: 10});
            input.handler({type: 'mousemove', button: 0, buttons: 3, which: 0, clientX: 40, clientY: 10});
            input.handler({type: 'mousemove', button: 0, buttons: 0, which: 0, clientX: 50, clientY: 10});

            assert.deepEqual(
                calls,
                [$H.INPUT_START, $H.INPUT_MOVE, $H.INPUT_MOVE, $H.INPUT_END],
                'mousemove with primary button bit in ev.buttons stays INPUT_MOVE and buttons === 0 ends gesture'
            );
            assert.equal(input.pressed, false, 'pressed reset once ev.buttons drops primary button');
        } finally {
            input.destroy();
        }
    });

    QUnit.test('MouseInput ignores non-primary mousedown/mouseup during an active left-button drag', function(assert) {
        var panEvents = [];
        manager = new Hammer.Manager(el, {
            inputClass: Hammer.MouseInput,
            recognizers: [[Hammer.Pan, {threshold: 5}]]
        });
        manager.on('panstart panmove panend pancancel', function(ev) {
            panEvents.push(ev.type);
        });

        // Left button down + move -> panstart
        manager.input.handler({type: 'mousedown', button: 0, buttons: 1, which: 1, clientX: 10, clientY: 10, target: el, preventDefault: function() {}});
        manager.input.handler({type: 'mousemove', button: 0, buttons: 1, which: 1, clientX: 30, clientY: 10, target: el, preventDefault: function() {}});
        assert.deepEqual(panEvents, ['panstart'], 'left drag started pan');

        // Right-click down & up while left button remains held must not abort or release drag
        manager.input.handler({type: 'mousedown', button: 2, buttons: 3, which: 3, clientX: 30, clientY: 10, target: el, preventDefault: function() {}});
        manager.input.handler({type: 'mouseup', button: 2, buttons: 1, which: 3, clientX: 30, clientY: 10, target: el, preventDefault: function() {}});
        assert.equal(manager.input.pressed, true, 'pressed remains true after right-button release');

        // Left drag continues and finishes cleanly
        manager.input.handler({type: 'mousemove', button: 0, buttons: 1, which: 1, clientX: 50, clientY: 10, target: el, preventDefault: function() {}});
        manager.input.handler({type: 'mouseup', button: 0, buttons: 0, which: 1, clientX: 50, clientY: 10, target: el, preventDefault: function() {}});
        assert.deepEqual(panEvents, ['panstart', 'panmove', 'panend'], 'left drag completes with panmove and panend');
        assert.equal(manager.input.pressed, false, 'pressed clears on primary button release');
    });

    QUnit.test('Manager options.inputClass uses custom input class', function(assert) {
        manager = new Hammer.Manager(el, {
            inputClass: Hammer.MouseInput,
            recognizers: [[Hammer.Tap]]
        });
        assert.ok(manager.input instanceof Hammer.MouseInput, 'Manager instantiates specified inputClass');
    });

    QUnit.test('PointerEventInput handles lifecycle, multi-pointer, cancel, and IE10 enums', function(assert) {
        var calls = [];
        manager = new Hammer.Manager(el, {recognizers: []});
        var input = new $H.PointerEventInput(manager, function(mgr, type, data) {
            calls.push({
                type: type,
                pointerType: data.pointerType,
                pointerCount: data.pointers.length,
                changedId: data.changedPointers[0].pointerId
            });
        });

        try {
            // Hover pointermove without pointerdown is ignored
            input.handler({type: 'pointermove', pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10});
            assert.equal(calls.length, 0, 'hover pointermove ignored');

            // Right-button mouse pointerdown is ignored
            input.handler({type: 'pointerdown', pointerId: 1, pointerType: 'mouse', button: 2, clientX: 10, clientY: 10});
            assert.equal(calls.length, 0, 'non-left mouse pointerdown ignored');

            // Mouse left-button lifecycle
            input.handler({type: 'pointerdown', pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10});
            input.handler({type: 'pointermove', pointerId: 1, pointerType: 'mouse', button: 0, clientX: 25, clientY: 25});
            input.handler({type: 'pointerup', pointerId: 1, pointerType: 'mouse', button: 0, clientX: 25, clientY: 25});

            assert.equal(calls.length, 3, 'mouse pointerdown/move/up dispatched');
            assert.equal(calls[0].type, $H.INPUT_START, 'pointerdown maps to INPUT_START');
            assert.equal(calls[1].type, $H.INPUT_MOVE, 'pointermove maps to INPUT_MOVE');
            assert.equal(calls[2].type, $H.INPUT_END, 'pointerup maps to INPUT_END');
            assert.equal(input.store.length, 0, 'pointer removed from store after pointerup');

            // Multi-touch + IE10 MS-prefixed events and numeric pointerType enums
            calls = [];
            input.handler({type: 'MSPointerDown', pointerId: 10, pointerType: 2, button: -1, clientX: 10, clientY: 10});
            input.handler({type: 'MSPointerDown', pointerId: 11, pointerType: 3, button: 0, clientX: 50, clientY: 50});
            assert.equal(input.store.length, 2, 'both pointers tracked in store');
            assert.equal(calls[0].pointerType, $H.INPUT_TYPE_TOUCH, 'IE10 enum 2 normalized to touch');
            assert.equal(calls[1].pointerType, $H.INPUT_TYPE_PEN, 'IE10 enum 3 normalized to pen');

            // Cancel first pointer, release second via pointerout
            input.handler({type: 'MSPointerCancel', pointerId: 10, pointerType: 2, clientX: 10, clientY: 10});
            assert.equal(calls[2].type, $H.INPUT_CANCEL, 'MSPointerCancel maps to INPUT_CANCEL');
            assert.equal(input.store.length, 1, 'cancelled pointer removed from store');

            input.handler({type: 'pointerout', pointerId: 11, pointerType: 3, clientX: 50, clientY: 50});
            assert.equal(calls[3].type, $H.INPUT_CANCEL, 'pointerout maps to INPUT_CANCEL');
            assert.equal(input.store.length, 0, 'store empty after all pointers removed');

            // Unknown pointerup is ignored
            calls = [];
            input.handler({type: 'pointerup', pointerId: 99, pointerType: 'touch', clientX: 0, clientY: 0});
            assert.equal(calls.length, 0, 'pointerup for untracked pointerId ignored');
        } finally {
            input.destroy();
        }
    });

    QUnit.test('PointerEventInput ends stuck mouse pointer when ev.buttons === 0 and clears store on destroy', function(assert) {
        var calls = [];
        manager = new Hammer.Manager(el, {recognizers: []});
        var input = new $H.PointerEventInput(manager, function(mgr, type) {
            calls.push(type);
        });

        try {
            // Mouse released outside window/iframe -> subsequent pointermove arrives with buttons === 0
            input.handler({type: 'pointerdown', pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX: 10, clientY: 10});
            input.handler({type: 'pointermove', pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX: 25, clientY: 10});
            input.handler({type: 'pointermove', pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0, clientX: 40, clientY: 10});
            input.handler({type: 'pointermove', pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0, clientX: 60, clientY: 10});

            assert.deepEqual(
                calls,
                [$H.INPUT_START, $H.INPUT_MOVE, $H.INPUT_END],
                'mouse pointermove with buttons === 0 converts to INPUT_END and stops subsequent hover events'
            );
            assert.equal(input.store.length, 0, 'stuck mouse pointer removed from store');

            // destroy() clears active pointers from store
            input.handler({type: 'pointerdown', pointerId: 2, pointerType: 'touch', button: 0, clientX: 15, clientY: 15});
            assert.equal(input.store.length, 1, 'touch pointer stored while active');
            input.destroy();
            assert.equal(input.store.length, 0, 'destroy() clears pointer store');
        } finally {
            input.destroy();
        }
    });

    QUnit.test('PointerEventInput ends hovering pen (buttons === 0) and chorded mouse after primary button release', function(assert) {
        var calls = [];
        manager = new Hammer.Manager(el, {recognizers: []});
        var input = new $H.PointerEventInput(manager, function(mgr, type) {
            calls.push(type);
        });

        try {
            // 1. Hovering stylus (pen) with buttons === 0 ends active pointer
            input.handler({type: 'pointerdown', pointerId: 1, pointerType: 'pen', button: 0, buttons: 1, clientX: 10, clientY: 10});
            input.handler({type: 'pointermove', pointerId: 1, pointerType: 'pen', button: 0, buttons: 1, clientX: 25, clientY: 10});
            input.handler({type: 'pointermove', pointerId: 1, pointerType: 'pen', button: 0, buttons: 0, clientX: 40, clientY: 10});
            assert.deepEqual(calls, [$H.INPUT_START, $H.INPUT_MOVE, $H.INPUT_END], 'hovering pen with buttons === 0 converts to INPUT_END');
            assert.equal(input.store.length, 0, 'hovering pen removed from store');

            // 2. Chorded mouse buttons: left down (1) -> right also down (3) -> left released while right held (2)
            calls = [];
            input.handler({type: 'pointerdown', pointerId: 2, pointerType: 'mouse', button: 0, buttons: 1, clientX: 10, clientY: 10});
            input.handler({type: 'pointermove', pointerId: 2, pointerType: 'mouse', button: 0, buttons: 3, clientX: 25, clientY: 10});
            input.handler({type: 'pointermove', pointerId: 2, pointerType: 'mouse', button: 0, buttons: 2, clientX: 40, clientY: 10});
            assert.deepEqual(calls, [$H.INPUT_START, $H.INPUT_MOVE, $H.INPUT_END], 'mouse releasing primary button while right button held converts to INPUT_END');
            assert.equal(input.store.length, 0, 'chorded mouse removed from store when primary button released');
        } finally {
            input.destroy();
        }
    });

    QUnit.test('SingleTouchInput handles start, move, multi-touch end, cancel, and pre-start ignore', function(assert) {
        var calls = [];
        manager = new Hammer.Manager(el, {recognizers: []});
        var input = new $H.SingleTouchInput(manager, function(mgr, type, data) {
            calls.push({
                type: type,
                pointersLen: data.pointers.length,
                changedLen: data.changedPointers.length,
                pointerType: data.pointerType
            });
        });

        try {
            var t1 = {identifier: 1, clientX: 10, clientY: 10};
            var t2 = {identifier: 2, clientX: 40, clientY: 40};

            // Move before start ignored
            input.handler({type: 'touchmove', touches: [t1], changedTouches: [t1]});
            assert.equal(calls.length, 0, 'touchmove ignored before touchstart');

            // Start with finger 1, add finger 2, move, lift finger 2 (still started), lift finger 1 (ends)
            input.handler({type: 'touchstart', touches: [t1], changedTouches: [t1]});
            assert.equal(input.started, true, 'started set to true on touchstart');

            input.handler({type: 'touchstart', touches: [t1, t2], changedTouches: [t2]});
            input.handler({type: 'touchmove', touches: [t1, t2], changedTouches: [t1, t2]});
            input.handler({type: 'touchend', touches: [t1], changedTouches: [t2]});
            assert.equal(input.started, true, 'started remains true while another touch is still active');
            assert.equal(calls[3].pointersLen, 2, 'normalizeSingleTouches merges active and ended touches');

            input.handler({type: 'touchend', touches: [], changedTouches: [t1]});
            assert.equal(input.started, false, 'started reset when final touch ends');
            assert.equal(calls[4].type, $H.INPUT_END, 'final touchend dispatched as INPUT_END');
            assert.equal(calls[4].pointerType, $H.INPUT_TYPE_TOUCH, 'pointerType is touch');

            // Cancel resets started
            calls = [];
            input.handler({type: 'touchstart', touches: [t1], changedTouches: [t1]});
            input.handler({type: 'touchcancel', touches: [], changedTouches: [t1]});
            assert.equal(input.started, false, 'started reset on touchcancel');
            assert.equal(calls[1].type, $H.INPUT_CANCEL, 'touchcancel dispatched as INPUT_CANCEL');
        } finally {
            input.destroy();
        }
    });

    QUnit.test('SingleTouchInput does not double-dispatch bubbled touchstart or double-emit Press({time: 0})', function(assert) {
        var inputCount = 0;
        var pressCount = 0;
        manager = new Hammer.Manager(el, {
            inputClass: Hammer.SingleTouchInput,
            recognizers: [[Hammer.Press, {time: 0}]]
        });
        manager.on('hammer.input', function() {
            inputCount++;
        });
        manager.on('press', function() {
            pressCount++;
        });

        // Dispatch a real bubbling touchstart on el (bubbles up to window where evWin also listens)
        utils.dispatchTouchEvent(el, 'start', 30, 30, 1);

        assert.equal(inputCount, 1, 'bubbled touchstart only dispatches hammer.input once');
        assert.equal(pressCount, 1, 'Press({time: 0}) only emits press once on a single touchstart');
    });

    QUnit.test('TouchInput isolates multi-user touches by target and ignores untracked touchend', function(assert) {
        var calls = [];
        manager = new Hammer.Manager(el, {recognizers: []});
        var input = new $H.TouchInput(manager, function(mgr, type, data) {
            calls.push({type: type, pointers: data.pointers, changed: data.changedPointers});
        });

        try {
            var otherEl = document.createElement('div');
            var childEl = document.createElement('span');
            el.appendChild(childEl);

            // Foreign touchend ignored
            var foreignTouch = {identifier: 999, clientX: 5, clientY: 5, target: otherEl};
            input.handler({type: 'touchend', touches: [], changedTouches: [foreignTouch]});
            assert.equal(calls.length, 0, 'touchend for untracked identifier does not invoke callback');

            // Multi-touch with one touch on child of target and one on unrelated element
            var ownTouch = {identifier: 1, clientX: 20, clientY: 20, target: childEl};
            var otherTouch = {identifier: 2, clientX: 80, clientY: 80, target: otherEl};
            input.handler({
                type: 'touchstart',
                touches: [ownTouch, otherTouch],
                changedTouches: [ownTouch, otherTouch]
            });
            assert.equal(calls.length, 1, 'touchstart dispatches for touch on target subtree');
            assert.equal(calls[0].pointers.length, 1, 'only target touch included in pointers');
            assert.equal(calls[0].pointers[0].identifier, 1, 'foreign element touch filtered out');
        } finally {
            input.destroy();
        }
    });

    QUnit.test('TouchInput retains already-tracked touches when their child target is detached mid-gesture', function(assert) {
        var calls = [];
        manager = new Hammer.Manager(el, {recognizers: []});
        var input = new $H.TouchInput(manager, function(mgr, type, data) {
            calls.push({type: type, pointers: data.pointers});
        });

        try {
            var childEl = document.createElement('span');
            el.appendChild(childEl);

            var t1 = {identifier: 1, clientX: 20, clientY: 20, target: childEl};
            var t2 = {identifier: 2, clientX: 60, clientY: 60, target: el};

            // Both touches start inside target
            input.handler({type: 'touchstart', touches: [t1, t2], changedTouches: [t1, t2]});
            assert.equal(calls[0].pointers.length, 2, 'both touches tracked on touchstart');

            // Remove childEl from DOM while both touches remain active
            el.removeChild(childEl);

            // Second finger moves; first finger (whose target is now detached) must stay in pointers
            input.handler({type: 'touchmove', touches: [t1, t2], changedTouches: [t2]});
            assert.equal(calls[1].pointers.length, 2, 'tracked touch on detached child stays in pointers during touchmove');
        } finally {
            input.destroy();
        }
    });

    QUnit.test('TouchInput attached to window tracks 2+ finger touches on DOM elements', function(assert) {
        var calls = [];
        manager = new Hammer.Manager(window, {recognizers: []});
        var input = new $H.TouchInput(manager, function(mgr, type, data) {
            calls.push({type: type, pointersLen: data.pointers.length});
        });

        try {
            var t1 = {identifier: 1, clientX: 20, clientY: 20, target: el};
            var t2 = {identifier: 2, clientX: 80, clientY: 80, target: el};

            input.handler({type: 'touchstart', touches: [t1], changedTouches: [t1]});
            input.handler({type: 'touchstart', touches: [t1, t2], changedTouches: [t2]});
            input.handler({type: 'touchmove', touches: [t1, t2], changedTouches: [t1, t2]});

            assert.equal(calls.length, 3, 'all 1-finger and 2-finger events dispatched when TouchInput target is window');
            assert.equal(calls[1].pointersLen, 2, 'second finger tracked on window TouchInput');
            assert.equal(calls[2].pointersLen, 2, '2-finger touchmove retains both pointers on window TouchInput');
        } finally {
            input.destroy();
        }
    });

    QUnit.test('TouchMouseInput deduplicates synthetic mouse events near recent touches and forwards distant mouse events', function(assert) {
        var calls = [];
        manager = new Hammer.Manager(el, {recognizers: []});
        var input = new $H.TouchMouseInput(manager, function(mgr, type, data) {
            calls.push({type: type, pointerType: data.pointerType});
        });

        try {
            var touchPointer = {identifier: 1, clientX: 100, clientY: 100};
            // Record a touch start & end at (100, 100)
            input.handler(manager, $H.INPUT_START, {
                pointerType: $H.INPUT_TYPE_TOUCH,
                pointers: [touchPointer],
                changedPointers: [touchPointer],
                srcEvent: {clientX: 100, clientY: 100}
            });
            input.handler(manager, $H.INPUT_END, {
                pointerType: $H.INPUT_TYPE_TOUCH,
                pointers: [touchPointer],
                changedPointers: [touchPointer],
                srcEvent: {clientX: 100, clientY: 100}
            });
            assert.equal(calls.length, 2, 'touch events forwarded');

            // Synthetic mouse event within DEDUP_DISTANCE (25px) should be suppressed
            input.handler(manager, $H.INPUT_START, {
                pointerType: $H.INPUT_TYPE_MOUSE,
                pointers: [{clientX: 110, clientY: 110}],
                changedPointers: [{clientX: 110, clientY: 110}],
                srcEvent: {clientX: 110, clientY: 110}
            });
            assert.equal(calls.length, 2, 'synthetic mouse event within 25px suppressed');

            // Genuine mouse event far away (> 25px) should pass through
            input.handler(manager, $H.INPUT_START, {
                pointerType: $H.INPUT_TYPE_MOUSE,
                pointers: [{clientX: 250, clientY: 250}],
                changedPointers: [{clientX: 250, clientY: 250}],
                srcEvent: {clientX: 250, clientY: 250}
            });
            assert.equal(calls.length, 3, 'distant mouse event forwarded');
            assert.equal(calls[2].pointerType, $H.INPUT_TYPE_MOUSE, 'forwarded event keeps mouse pointerType');

            // Expired touch records are pruned by timestamp without timers
            input.lastTouches.forEach(function(entry) {
                entry.t -= $H.DEDUP_TIMEOUT + 1;
            });
            input.handler(manager, $H.INPUT_START, {
                pointerType: $H.INPUT_TYPE_MOUSE,
                pointers: [{clientX: 110, clientY: 110}],
                changedPointers: [{clientX: 110, clientY: 110}],
                srcEvent: {clientX: 110, clientY: 110}
            });
            assert.equal(calls.length, 4, 'mouse event passes once dedup timestamp expires');
            assert.equal(input.lastTouches.length, 0, 'expired lastTouches entries pruned');
        } finally {
            input.destroy();
        }
    });

    QUnit.test('TouchMouseInput rebinds touch and mouse listeners when Manager.set updates inputTarget', function(assert) {
        var newTarget = utils.createHitArea();
        var tapCount = 0;

        manager = new Hammer.Manager(el, {
            inputClass: Hammer.TouchMouseInput,
            recognizers: [[Hammer.Tap]]
        });
        manager.on('tap', function() {
            tapCount++;
        });

        manager.set({inputTarget: newTarget});
        assert.strictEqual(manager.input.touch.target, newTarget, 'child TouchInput target updated');
        assert.strictEqual(manager.input.mouse.target, newTarget, 'child MouseInput target updated');

        // Old target no longer triggers tap
        utils.dispatchTouchEvent(el, 'start', 50, 50);
        utils.dispatchTouchEvent(el, 'end', 50, 50);
        assert.equal(tapCount, 0, 'old inputTarget no longer triggers tap');

        // New target triggers tap
        utils.dispatchTouchEvent(newTarget, 'start', 50, 50);
        utils.dispatchTouchEvent(newTarget, 'end', 50, 50);
        assert.equal(tapCount, 1, 'new inputTarget triggers tap after set({inputTarget})');
    });

    QUnit.test('TouchMouseInput resets child MouseInput on suppressed synthetic mousedown so blur emits no phantom cancel', function(assert) {
        var calls = [];
        manager = new Hammer.Manager(el, {recognizers: []});
        var input = new $H.TouchMouseInput(manager, function(mgr, type, data) {
            calls.push({type: type, pointerType: data.pointerType});
        });

        try {
            var touchObj = {identifier: 1, clientX: 50, clientY: 50, target: el};

            // Case 1: Synthetic mousedown suppressed via sourceCapabilities.firesTouchEvents
            input.touch.handler({type: 'touchstart', touches: [touchObj], changedTouches: [touchObj], target: el});
            input.touch.handler({type: 'touchend', touches: [], changedTouches: [touchObj], target: el});
            input.mouse.handler({
                type: 'mousedown',
                button: 0,
                which: 1,
                clientX: 50,
                clientY: 50,
                sourceCapabilities: {firesTouchEvents: true}
            });
            assert.equal(input.mouse.pressed, false, 'child MouseInput.pressed reset when firesTouchEvents mousedown is suppressed');

            calls = [];
            input.mouse.handler({type: 'blur'});
            assert.equal(calls.length, 0, 'window blur after suppressed firesTouchEvents mousedown emits no phantom INPUT_CANCEL');

            // Case 2: Synthetic mousedown suppressed via coordinate dedup without sourceCapabilities
            input.mouse.handler({
                type: 'mousedown',
                button: 0,
                which: 1,
                clientX: 52,
                clientY: 52
            });
            assert.equal(input.mouse.pressed, false, 'child MouseInput.pressed reset when deduped mousedown is suppressed');

            calls = [];
            input.mouse.handler({type: 'blur'});
            assert.equal(calls.length, 0, 'window blur after coordinate-deduped mousedown emits no phantom INPUT_CANCEL');
        } finally {
            input.destroy();
        }
    });

    QUnit.test('Input domHandler ignores events if manager was destroyed during the same dispatch', function(assert) {
        assert.expect(1);

        manager = new Hammer.Manager(el, {
            domEvents: true,
            inputClass: Hammer.MouseInput,
            recognizers: [[Hammer.Tap]]
        });

        var domHandler = manager.input.domHandler;
        domHandler({type: 'mousedown', button: 0, which: 1, clientX: 10, clientY: 10, target: el, preventDefault: function() {}});
        manager.destroy();

        // Simulate a browser invoking a snapshotted listener after destroy()
        domHandler({type: 'mouseup', button: 0, which: 1, clientX: 10, clientY: 10, target: el, preventDefault: function() {}});
        assert.ok(true, 'domHandler does not throw after manager.destroy()');
        manager = null;
    });

    QUnit.test('Manager options.pointerTypes filters disallowed pointer types across input drivers', function(assert) {
        var calls = [];
        manager = new Hammer.Manager(el, {
            recognizers: [],
            pointerTypes: ['touch']
        });

        var pe = new $H.PointerEventInput(manager, function(mgr, type, data) {
            calls.push({type: type, pointerType: data.pointerType});
        });
        var mi = new $H.MouseInput(manager, function(mgr, type, data) {
            calls.push({type: type, pointerType: data.pointerType});
        });
        var ti = new $H.TouchInput(manager, function(mgr, type, data) {
            calls.push({type: type, pointerType: data.pointerType});
        });
        var sti = new $H.SingleTouchInput(manager, function(mgr, type, data) {
            calls.push({type: type, pointerType: data.pointerType});
        });

        try {
            // Mouse events are ignored and never pollute store/pressed
            pe.handler({type: 'pointerdown', pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10});
            pe.handler({type: 'pointermove', pointerId: 1, pointerType: 'mouse', button: 0, clientX: 20, clientY: 10});
            mi.handler({type: 'mousedown', button: 0, which: 1, clientX: 10, clientY: 10});
            assert.equal(calls.length, 0, 'mouse events ignored when pointerTypes is ["touch"]');
            assert.equal(pe.store.length, 0, 'ignored mouse pointer never enters PointerEventInput.store');
            assert.equal(mi.pressed, false, 'ignored mouse event never sets MouseInput.pressed');

            // Touch events are accepted
            pe.handler({type: 'pointerdown', pointerId: 2, pointerType: 'touch', button: 0, clientX: 10, clientY: 10});
            pe.handler({type: 'pointerup', pointerId: 2, pointerType: 'touch', button: 0, clientX: 10, clientY: 10});
            assert.equal(calls.length, 2, 'touch events accepted when pointerTypes is ["touch"]');

            // Updating pointerTypes via Manager.set()
            calls = [];
            manager.set({pointerTypes: ['touch', 'pen']});
            pe.handler({type: 'pointerdown', pointerId: 3, pointerType: 'pen', button: 0, clientX: 10, clientY: 10});
            pe.handler({type: 'pointerup', pointerId: 3, pointerType: 'pen', button: 0, clientX: 10, clientY: 10});
            pe.handler({type: 'pointerdown', pointerId: 4, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10});
            assert.equal(calls.length, 2, 'pen accepted and mouse rejected with pointerTypes: ["touch", "pen"]');
            assert.equal(calls[0].pointerType, $H.INPUT_TYPE_PEN, 'pen pointerType preserved');

            // Empty pointerType never matches
            assert.equal($H.isAllowedPointerType(manager, ''), false, 'empty pointerType rejected');

            // TouchInput and SingleTouchInput short-circuit before mutating state when touch is disallowed
            calls = [];
            manager.set({pointerTypes: ['mouse']});
            var touchObj = {identifier: 7, clientX: 10, clientY: 10, target: el};
            ti.handler({type: 'touchstart', touches: [touchObj], changedTouches: [touchObj], target: el});
            sti.handler({type: 'touchstart', touches: [touchObj], changedTouches: [touchObj], target: el});
            assert.equal(calls.length, 0, 'TouchInput and SingleTouchInput ignore touch when pointerTypes is ["mouse"]');
            assert.equal(ti.targetIds[7], undefined, 'TouchInput does not record targetIds for disallowed touch');
            assert.equal(sti.started, false, 'SingleTouchInput does not set started for disallowed touch');

            // inputHandler catch-all filters custom/direct input
            var inputEvents = [];
            manager.on('hammer.input', function(ev) {
                inputEvents.push(ev.pointerType);
            });
            $H.inputHandler(manager, $H.INPUT_START, {
                pointers: [{clientX: 10, clientY: 10}],
                changedPointers: [{clientX: 10, clientY: 10}],
                pointerType: $H.INPUT_TYPE_TOUCH,
                srcEvent: {target: el}
            });
            assert.equal(inputEvents.length, 0, 'inputHandler drops disallowed pointerType');
        } finally {
            pe.destroy();
            mi.destroy();
            ti.destroy();
            sti.destroy();
        }
    });

    QUnit.test('PointerEventInput prunes leaked pointers on primary pointerdown and cancels on blur', function(assert) {
        var calls = [];
        manager = new Hammer.Manager(el, {
            recognizers: [],
            pointerTypes: ['touch', 'pen']
        });
        var input = new $H.PointerEventInput(manager, function(mgr, type, data) {
            calls.push({
                type: type,
                pointerType: data.pointerType,
                pointersLen: data.pointers.length,
                changedLen: data.changedPointers.length,
                x: data.pointers[0].clientX
            });
        });

        try {
            // Simulate a leaked touch pointer (pointerup/pointercancel dropped) alongside an active pen
            input.handler({type: 'pointerdown', pointerId: 10, pointerType: 'touch', isPrimary: true, button: 0, clientX: 10, clientY: 10});
            input.handler({type: 'pointerdown', pointerId: 11, pointerType: 'touch', isPrimary: false, button: 0, clientX: 30, clientY: 30});
            input.handler({type: 'pointerup', pointerId: 10, pointerType: 'touch', isPrimary: true, button: 0, clientX: 10, clientY: 10});
            input.handler({type: 'pointerdown', pointerId: 20, pointerType: 'pen', isPrimary: true, button: 0, clientX: 50, clientY: 50});
            assert.equal(input.store.length, 2, 'leaked touch 11 and active pen 20 are in store');

            // New primary touchstart evicts leaked touch 11 without touching pen 20
            calls = [];
            input.handler({type: 'pointerdown', pointerId: 12, pointerType: 'touch', isPrimary: true, button: 0, clientX: 70, clientY: 70});
            assert.equal(input.store.length, 2, 'leaked touch evicted, active pen preserved, new touch stored');
            assert.equal(input.store[0].pointerId, 20, 'pen pointer remains in store');
            assert.equal(input.store[1].pointerId, 12, 'new primary touch stored');

            // Non-primary secondary touch does not evict existing touch
            input.handler({type: 'pointerdown', pointerId: 13, pointerType: 'touch', isPrimary: false, button: 0, clientX: 90, clientY: 90});
            assert.equal(input.store.length, 3, 'secondary touch appends normally');

            // Window blur cancels all active pointers even when pointerTypes is restricted
            calls = [];
            input.handler({type: 'blur'});
            assert.equal(input.store.length, 0, 'blur clears pointer store');
            assert.equal(calls.length, 1, 'blur emits one INPUT_CANCEL');
            assert.equal(calls[0].type, $H.INPUT_CANCEL, 'blur maps to INPUT_CANCEL');
            assert.equal(calls[0].pointersLen, 3, 'all cancelled pointers passed in pointers');
            assert.equal(calls[0].changedLen, 3, 'changedPointers matches pointers so isFinal is true');
            assert.equal(calls[0].x, 50, 'stored pointer coordinates preserved for cancel event');

            // Subsequent blur with empty store is a no-op
            calls = [];
            input.handler({type: 'blur'});
            assert.equal(calls.length, 0, 'blur ignored when no pointers are active');
        } finally {
            input.destroy();
        }
    });

    QUnit.test('PointerEventInput blur cancels active Pan and pending Press without NaN coordinates', function(assert) {
        var done = assert.async();
        var events = [];
        var pressCount = 0;
        manager = new Hammer.Manager(el, {
            inputClass: Hammer.PointerEventInput,
            recognizers: [
                [Hammer.Pan, {threshold: 5}],
                [Hammer.Press, {time: 30}]
            ]
        });
        manager.on('panstart pancancel', function(ev) {
            events.push({type: ev.type, isFinal: ev.isFinal, x: ev.center.x, y: ev.center.y});
        });
        manager.on('press', function() {
            pressCount++;
        });

        // Active pan cancelled on blur with valid coordinates
        manager.input.handler({type: 'pointerdown', pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: 10, clientY: 20, target: el});
        manager.input.handler({type: 'pointermove', pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: 30, clientY: 20, target: el});
        manager.input.handler({type: 'blur', target: window});

        assert.equal(events.length, 2, 'panstart and pancancel fired');
        assert.equal(events[0].type, 'panstart', 'pan started');
        assert.equal(events[1].type, 'pancancel', 'blur emitted pancancel');
        assert.equal(events[1].isFinal, true, 'blur cancel marks session as isFinal');
        assert.equal(events[1].x, 30, 'cancel center.x stays finite from last pointer');
        assert.equal(events[1].y, 20, 'cancel center.y stays finite from last pointer');

        // Pending press (without moving past threshold) is cancelled on blur
        manager.input.handler({type: 'pointerdown', pointerId: 2, pointerType: 'touch', isPrimary: true, button: 0, clientX: 10, clientY: 20, target: el});
        manager.input.handler({type: 'blur', target: window});

        setTimeout(function() {
            assert.equal(pressCount, 0, 'blur cancelled pending press timer');
            done();
        }, 60);
    });

    QUnit.test('MouseInput cancels active press on blur and TouchInput resets leaked targetIds on single touchstart', function(assert) {
        var mouseCalls = [];
        manager = new Hammer.Manager(el, {recognizers: []});
        var mi = new $H.MouseInput(manager, function(mgr, type, data) {
            mouseCalls.push({type: type, x: data.pointers[0].clientX});
        });
        var ti = new $H.TouchInput(manager, function() {});

        try {
            // Blur while not pressed does nothing
            mi.handler({type: 'blur'});
            assert.equal(mouseCalls.length, 0, 'blur ignored when mouse not pressed');

            // Active mouse drag cancelled on blur with last mouse coordinates
            mi.handler({type: 'mousedown', button: 0, which: 1, clientX: 15, clientY: 25});
            mi.handler({type: 'mousemove', button: 0, which: 1, clientX: 40, clientY: 25});
            mi.handler({type: 'blur'});
            assert.equal(mi.pressed, false, 'MouseInput.pressed reset on blur');
            assert.equal(mi.lastEv, null, 'MouseInput.lastEv cleared on blur');
            assert.equal(mouseCalls[2].type, $H.INPUT_CANCEL, 'MouseInput emits INPUT_CANCEL on blur');
            assert.equal(mouseCalls[2].x, 40, 'MouseInput cancel preserves last pointer coordinates');

            // TouchInput clears leaked targetIds when a fresh single-finger touchstart arrives
            var t1 = {identifier: 1, clientX: 10, clientY: 10, target: el};
            var t2 = {identifier: 2, clientX: 20, clientY: 20, target: el};
            var t3 = {identifier: 3, clientX: 30, clientY: 30, target: el};
            ti.handler({type: 'touchstart', touches: [t1], changedTouches: [t1]});
            assert.equal(ti.targetIds[1], true, 'initial touch id tracked');

            // Finger 1 dropped without touchend; new single touchstart with finger 2 resets targetIds
            ti.handler({type: 'touchstart', touches: [t2], changedTouches: [t2]});
            assert.equal(ti.targetIds[1], undefined, 'leaked touch id purged on fresh single touchstart');
            assert.equal(ti.targetIds[2], true, 'new touch id tracked');

            // Adding a second simultaneous finger keeps existing targetIds
            ti.handler({type: 'touchstart', touches: [t2, t3], changedTouches: [t3]});
            assert.equal(ti.targetIds[2], true, 'existing touch id retained during multi-touch start');
            assert.equal(ti.targetIds[3], true, 'second touch id tracked');
        } finally {
            mi.destroy();
            ti.destroy();
        }
    });

    QUnit.test('fresh primary pointerdown resets active Pan state after a leaked pointer', function(assert) {
        var events = [];
        manager = new Hammer.Manager(el, {
            inputClass: Hammer.PointerEventInput,
            recognizers: [
                [Hammer.Pan, {threshold: 5}],
                [Hammer.Tap]
            ]
        });
        manager.on('panstart panmove panend tap', function(ev) {
            events.push(ev.type);
        });

        // Start a pan whose pointerup/pointercancel is dropped without blur
        manager.input.handler({type: 'pointerdown', pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: 10, clientY: 10, target: el});
        manager.input.handler({type: 'pointermove', pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: 40, clientY: 10, target: el});
        assert.deepEqual(events, ['panstart'], 'pan started on first pointer');

        // Fresh primary tap must reset stuck Pan state instead of firing panmove on pointerdown
        events = [];
        manager.input.handler({type: 'pointerdown', pointerId: 2, pointerType: 'touch', isPrimary: true, button: 0, clientX: 10, clientY: 10, target: el});
        manager.input.handler({type: 'pointerup', pointerId: 2, pointerType: 'touch', isPrimary: true, button: 0, clientX: 10, clientY: 10, target: el});
        assert.deepEqual(events, ['tap'], 'subsequent tap succeeds without bogus panmove');
    });

    QUnit.test('Input.prototype.destroy resets active state on TouchInput and SingleTouchInput during set(inputTarget)', function(assert) {
        var newTarget = utils.createHitArea();

        manager = new Hammer.Manager(el, {
            inputClass: Hammer.SingleTouchInput,
            recognizers: []
        });
        var t1 = {identifier: 1, clientX: 10, clientY: 10, target: el};
        manager.input.handler({type: 'touchstart', touches: [t1], changedTouches: [t1]});
        assert.equal(manager.input.started, true, 'SingleTouchInput started before inputTarget change');

        manager.set({inputTarget: newTarget});
        assert.equal(manager.input.started, false, 'SingleTouchInput.started reset when inputTarget is updated');
        manager.destroy();

        manager = new Hammer.Manager(el, {
            inputClass: Hammer.TouchInput,
            recognizers: []
        });
        manager.input.handler({type: 'touchstart', touches: [t1], changedTouches: [t1]});
        assert.equal(manager.input.targetIds[1], true, 'TouchInput tracked touch before inputTarget change');

        manager.set({inputTarget: newTarget});
        assert.equal(manager.input.targetIds[1], undefined, 'TouchInput.targetIds reset when inputTarget is updated');
    });

    QUnit.test('Manager.set({pointerTypes}) mid-gesture resets active input store and recognizers', function(assert) {
        var penTaps = 0;
        var panEvents = [];
        manager = new Hammer.Manager(el, {
            inputClass: Hammer.PointerEventInput,
            recognizers: [
                [Hammer.Tap],
                [Hammer.Pan, {threshold: 5}]
            ]
        });
        manager.on('tap', function(ev) {
            if (ev.pointerType === 'pen') {
                penTaps++;
            }
        });
        manager.on('panstart panmove panend', function(ev) {
            panEvents.push(ev.type);
        });

        // Start a touch drag, then restrict pointerTypes to ['pen'] before touch lifts
        manager.input.handler({type: 'pointerdown', pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: 10, clientY: 10, target: el});
        manager.input.handler({type: 'pointermove', pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: 30, clientY: 10, target: el});
        assert.equal(manager.input.store.length, 1, 'touch pointer active before set({pointerTypes})');

        manager.set({pointerTypes: ['pen']});
        assert.equal(manager.input.store.length, 0, 'set({pointerTypes}) clears active pointer store immediately');

        // Touch release arrives after pointerTypes dropped 'touch'
        manager.input.handler({type: 'pointerup', pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: 30, clientY: 10, target: el});
        assert.equal(manager.input.store.length, 0, 'store stays empty after ignored touch pointerup');

        // Subsequent pen tap must recognize as single-pointer gesture (not blocked by leaked touch)
        manager.input.handler({type: 'pointerdown', pointerId: 2, pointerType: 'pen', isPrimary: true, button: 0, clientX: 50, clientY: 50, target: el});
        manager.input.handler({type: 'pointerup', pointerId: 2, pointerType: 'pen', isPrimary: true, button: 0, clientX: 50, clientY: 50, target: el});
        assert.equal(penTaps, 1, 'pen tap recognizes cleanly after mid-gesture pointerTypes change');
        assert.deepEqual(panEvents, ['panstart'], 'reset Pan recognizer does not leak into subsequent pen gesture');
    });

    QUnit.test('SingleTouchInput ignores empty touchend/touchcancel instead of emitting empty pointers', function(assert) {
        var calls = [];
        manager = new Hammer.Manager(el, {recognizers: []});
        var input = new $H.SingleTouchInput(manager, function(mgr, type, data) {
            calls.push({type: type, pointersLen: data.pointers.length});
        });

        try {
            var t1 = {identifier: 1, clientX: 10, clientY: 10};
            input.handler({type: 'touchstart', touches: [t1], changedTouches: [t1]});
            assert.equal(calls.length, 1, 'initial touchstart dispatched');

            // Empty touchend (touches: [], changedTouches: [])
            input.handler({type: 'touchend', touches: [], changedTouches: []});
            assert.equal(calls.length, 1, 'empty touchend is not forwarded to callback');
            assert.equal(input.started, false, 'empty touchend still resets started to false');

            // Empty touchcancel (touches: [], changedTouches: [])
            input.handler({type: 'touchstart', touches: [t1], changedTouches: [t1]});
            input.handler({type: 'touchcancel', touches: [], changedTouches: []});
            assert.equal(calls.length, 2, 'empty touchcancel is not forwarded to callback');
            assert.equal(input.started, false, 'empty touchcancel still resets started to false');
        } finally {
            input.destroy();
        }
    });

    QUnit.test('Input touch listeners use passive listeners when native touch-action applies and never force non-passive on window evWin', function(assert) {
        var origWinAdd = window.addEventListener;
        var origWinRemove = window.removeEventListener;
        var winAdded = [];
        window.addEventListener = function(type, fn, opts) {
            winAdded.push({type: type, opts: opts});
            return origWinAdd.call(this, type, fn, opts);
        };
        window.removeEventListener = function(type, fn, opts) {
            return origWinRemove.call(this, type, fn, opts);
        };

        var elAdded = [];
        var origElAdd = el.addEventListener;
        el.addEventListener = function(type, fn, opts) {
            elAdded.push({type: type, opts: opts});
            return origElAdd.call(this, type, fn, opts);
        };

        var map = $H.TOUCH_ACTION_MAP;
        var origNone = map ? map.none : undefined;
        try {
            // 1. SingleTouchInput never registers {passive: false} on window
            manager = new Hammer.Manager(el, {inputClass: Hammer.SingleTouchInput, recognizers: []});
            var winTouchMove = winAdded.filter(function(item) { return item.type === 'touchmove'; })[0];
            assert.ok(winTouchMove, 'SingleTouchInput attaches touchmove on window');
            assert.deepEqual(winTouchMove.opts, {passive: true}, 'SingleTouchInput evWin touchmove is passive on window');
            manager.destroy();

            // 2. TouchInput on DOM element with native touch-action registers {passive: true}
            elAdded = [];
            manager = new Hammer.Manager(el, {inputClass: Hammer.TouchInput, recognizers: []});
            var elTouchMove = elAdded.filter(function(item) { return item.type === 'touchmove'; })[0];
            assert.deepEqual(elTouchMove.opts, {passive: true}, 'TouchInput on element with native touch-action uses {passive: true}');
            manager.destroy();

            // 3. TouchInput falls back to {passive: false} when native touch-action is unavailable
            if (map) {
                map.none = false;
                elAdded = [];
                manager = new Hammer.Manager(el, {inputClass: Hammer.TouchInput, recognizers: []});
                var fallbackMove = elAdded.filter(function(item) { return item.type === 'touchmove'; })[0];
                assert.deepEqual(fallbackMove.opts, {passive: false}, 'TouchInput uses {passive: false} when native touch-action is unavailable');
                manager.destroy();
                map.none = origNone;
            }

            // 4. TouchInput attached directly to window uses {passive: false} for touchAction: none, {passive: true} for auto
            winAdded = [];
            manager = new Hammer.Manager(window, {inputClass: Hammer.TouchInput, touchAction: 'none', recognizers: []});
            var winNoneMove = winAdded.filter(function(item) { return item.type === 'touchmove'; })[0];
            assert.deepEqual(winNoneMove.opts, {passive: false}, 'TouchInput on window with touchAction: none uses {passive: false}');
            manager.destroy();

            winAdded = [];
            manager = new Hammer.Manager(window, {inputClass: Hammer.TouchInput, touchAction: 'auto', recognizers: []});
            var winAutoMove = winAdded.filter(function(item) { return item.type === 'touchmove'; })[0];
            assert.deepEqual(winAutoMove.opts, {passive: true}, 'TouchInput on window with touchAction: auto uses {passive: true}');

            // 5. Manager.set({ touchAction }) rebinds TouchInput listeners when passive-ness changes
            winAdded = [];
            manager.set({touchAction: 'none'});
            var winReboundNone = winAdded.filter(function(item) { return item.type === 'touchmove'; })[0];
            assert.ok(winReboundNone, 'Manager.set({touchAction: "none"}) rebinds touchmove on window');
            assert.deepEqual(winReboundNone && winReboundNone.opts, {passive: false}, 'rebound touchmove on window uses {passive: false}');

            winAdded = [];
            manager.set({touchAction: 'auto'});
            var winReboundAuto = winAdded.filter(function(item) { return item.type === 'touchmove'; })[0];
            assert.ok(winReboundAuto, 'Manager.set({touchAction: "auto"}) rebinds touchmove on window');
            assert.deepEqual(winReboundAuto && winReboundAuto.opts, {passive: true}, 'rebound touchmove on window returns to {passive: true}');
            manager.destroy();

            // 6. getTouchListenerOptions checks manager.element.style (not inputTarget.style)
            elAdded = [];
            manager = new Hammer.Manager(document, {inputTarget: el, inputClass: Hammer.TouchInput, touchAction: 'none', recognizers: []});
            var docElMove = elAdded.filter(function(item) { return item.type === 'touchmove'; })[0];
            assert.deepEqual(docElMove.opts, {passive: false}, 'document manager with styled inputTarget uses {passive: false}');
            manager.destroy();

            var origDocAdd = document.addEventListener;
            var docAdded = [];
            document.addEventListener = function(type, fn, opts) {
                docAdded.push({type: type, opts: opts});
                return origDocAdd.call(this, type, fn, opts);
            };
            try {
                manager = new Hammer.Manager(el, {inputTarget: document, inputClass: Hammer.TouchInput, touchAction: 'none', recognizers: []});
                var elDocMove = docAdded.filter(function(item) { return item.type === 'touchmove'; })[0];
                assert.deepEqual(elDocMove.opts, {passive: true}, 'styled element manager with document inputTarget uses {passive: true}');
                manager.destroy();
            } finally {
                document.addEventListener = origDocAdd;
            }
            manager = null;
        } finally {
            window.addEventListener = origWinAdd;
            window.removeEventListener = origWinRemove;
            el.addEventListener = origElAdd;
            if (map) {
                map.none = origNone;
            }
        }
    });

    QUnit.test('TouchMouseInput preserves active mouse drag crossing recent touch, suppresses synthetic mouse under pointerTypes: [mouse], and resets both children when disabled', function(assert) {
        // 1. Active mouse drag crossing within 25px of a recent touch is not aborted
        var panEvents = [];
        manager = new Hammer.Manager(el, {
            inputClass: Hammer.TouchMouseInput,
            recognizers: [[Hammer.Pan, {threshold: 5}]]
        });
        manager.on('panstart panmove panend', function(ev) {
            panEvents.push(ev.type);
        });

        var t = {identifier: 1, clientX: 100, clientY: 100, target: el};
        manager.input.touch.handler({type: 'touchstart', touches: [t], changedTouches: [t], target: el});
        manager.input.touch.handler({type: 'touchend', touches: [], changedTouches: [t], target: el});

        // Start mouse drag far from (100, 100), then drag directly across (102, 100) and finish
        manager.input.mouse.handler({type: 'mousedown', button: 0, buttons: 1, which: 1, clientX: 250, clientY: 100, target: el, preventDefault: function() {}});
        manager.input.mouse.handler({type: 'mousemove', button: 0, buttons: 1, which: 1, clientX: 200, clientY: 100, target: el, preventDefault: function() {}});
        manager.input.mouse.handler({type: 'mousemove', button: 0, buttons: 1, which: 1, clientX: 102, clientY: 100, target: el, preventDefault: function() {}});
        manager.input.mouse.handler({type: 'mouseup', button: 0, buttons: 0, which: 1, clientX: 102, clientY: 100, target: el, preventDefault: function() {}});

        assert.deepEqual(panEvents, ['panstart', 'panmove', 'panend'], 'active mouse drag crossing recent touch coordinates is not aborted');
        assert.equal(manager.input._activeMouse, false, '_activeMouse resets after mouseup');
        manager.destroy();

        // 2. pointerTypes: ['mouse'] still records touch coords to suppress synthetic mouse events
        var taps = 0;
        manager = new Hammer.Manager(el, {
            inputClass: Hammer.TouchMouseInput,
            pointerTypes: ['mouse'],
            recognizers: [[Hammer.Tap]]
        });
        manager.on('tap', function() {
            taps++;
        });
        manager.input.touch.handler({type: 'touchstart', touches: [t], changedTouches: [t], target: el});
        manager.input.touch.handler({type: 'touchend', touches: [], changedTouches: [t], target: el});
        assert.equal(taps, 0, 'touch tap blocked by pointerTypes: ["mouse"]');

        manager.input.mouse.handler({type: 'mousedown', button: 0, buttons: 1, which: 1, clientX: 100, clientY: 100, target: el});
        manager.input.mouse.handler({type: 'mouseup', button: 0, buttons: 0, which: 1, clientX: 100, clientY: 100, target: el});
        assert.equal(taps, 0, 'synthetic mouse event following filtered touch is still deduplicated');
        manager.destroy();

        // 3. Disabling manager via dynamic enable resets BOTH child touch and mouse inputs
        var enabled = true;
        manager = new Hammer.Manager(el, {
            inputClass: Hammer.TouchMouseInput,
            enable: function() {
                return enabled;
            },
            recognizers: []
        });
        manager.input.touch.domHandler({type: 'touchstart', touches: [t], changedTouches: [t], target: el});
        assert.equal(manager.input.touch.targetIds[1], true, 'child touch tracked pointer');
        enabled = false;
        manager.input.mouse.domHandler({type: 'mousemove', button: 0, buttons: 0, which: 0, clientX: 20, clientY: 20, target: el});
        assert.equal(manager.input.touch.targetIds[1], undefined, 'disabling manager resets sibling child TouchInput via manager.input.reset()');
    });

    QUnit.test('SingleTouchInput isolates sibling elements, resists stop(true) on touchstart, and ignores empty touchstart', function(assert) {
        var sibling = utils.createHitArea();
        var calls = [];
        manager = new Hammer.Manager(el, {
            inputClass: Hammer.SingleTouchInput,
            recognizers: [[Hammer.Press, {time: 0}]]
        });
        manager.on('hammer.input', function(ev) {
            calls.push(ev.eventType);
            if (ev.eventType === Hammer.INPUT_START) {
                manager.stop(true);
            }
        });

        // 1. Touch on unrelated sibling element must not activate SingleTouchInput on el
        utils.dispatchTouchEvent(sibling, 'start', 20, 20, 1);
        assert.equal(manager.input.started, false, 'touchstart on sibling does not activate SingleTouchInput');
        assert.equal(calls.length, 0, 'touchstart on sibling does not emit hammer.input on el');

        // 2. Calling manager.stop(true) inside touchstart does not cause window bubble to re-dispatch
        utils.dispatchTouchEvent(el, 'start', 20, 20, 2);
        assert.equal(calls.length, 1, 'bubbled touchstart is still deduplicated after stop(true) calls reset()');

        // 3. Empty touchstart does not set started = true; non-start event clears _lastEv
        manager.input.reset();
        manager.input.handler({type: 'touchstart', touches: [], changedTouches: []});
        assert.equal(manager.input.started, false, 'empty touchstart does not set started = true');
        manager.input.handler({type: 'touchend', touches: [], changedTouches: []});
        assert.strictEqual(manager.input._lastEv, null, 'non-start event clears _lastEv reference');
    });

    QUnit.test('PointerEventInput ignores secondary-button pointerdown on tracked pointerId and prototype keys', function(assert) {
        var calls = [];
        manager = new Hammer.Manager(el, {recognizers: []});
        var input = new $H.PointerEventInput(manager, function(mgr, type, data) {
            calls.push({type: type, pointerType: data.pointerType});
        });

        try {
            input.handler({type: 'pointerdown', pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX: 10, clientY: 10});
            input.handler({type: 'pointerdown', pointerId: 1, pointerType: 'mouse', button: 2, buttons: 3, clientX: 10, clientY: 10});
            assert.equal(calls.length, 1, 'secondary-button pointerdown on already-tracked pointerId does not emit bogus INPUT_START');

            // Prototype property names do not collide with IE10_POINTER_TYPE_ENUM or POINTER_INPUT_MAP
            input.handler({type: 'toString', pointerId: 2, pointerType: 'toString', button: 0, clientX: 10, clientY: 10});
            assert.equal(calls.length, 1, 'prototype method name as ev.type is safely ignored');
            assert.strictEqual($H.normalizePointerType('toString'), 'toString', 'normalizePointerType does not match Object.prototype.toString');
        } finally {
            input.destroy();
        }
    });
})();
