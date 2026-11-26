(function() {
    var el, manager;

    module('Input Drivers', {
        setup: function() {
            el = utils.createHitArea();
        },
        teardown: function() {
            if (manager) {
                manager.destroy();
                manager = null;
            }
        }
    });

    test('MouseInput handles left-button press, move, release, and lost-button move', function() {
        var calls = [];
        manager = new Hammer.Manager(el, {recognizers: []});
        var input = new $H.MouseInput(manager, function(mgr, type, data) {
            calls.push({type: type, data: data});
        });

        try {
            // Move before mousedown is ignored
            input.handler({type: 'mousemove', button: 0, which: 1, clientX: 10, clientY: 10});
            equal(calls.length, 0, 'mousemove ignored when not pressed');

            // Right-click mousedown is ignored
            input.handler({type: 'mousedown', button: 2, which: 3, clientX: 10, clientY: 10});
            equal(calls.length, 0, 'non-left mousedown ignored');
            equal(input.pressed, false, 'pressed remains false for non-left button');

            // Left-click start -> move -> end
            input.handler({type: 'mousedown', button: 0, which: 1, clientX: 10, clientY: 20});
            input.handler({type: 'mousemove', button: 0, which: 1, clientX: 30, clientY: 40});
            input.handler({type: 'mouseup', button: 0, which: 1, clientX: 30, clientY: 40});

            equal(calls.length, 3, 'start, move, end dispatched');
            equal(calls[0].type, $H.INPUT_START, 'first event is INPUT_START');
            equal(calls[0].data.pointerType, $H.INPUT_TYPE_MOUSE, 'pointerType is mouse');
            equal(calls[1].type, $H.INPUT_MOVE, 'second event is INPUT_MOVE');
            equal(calls[2].type, $H.INPUT_END, 'third event is INPUT_END');
            equal(input.pressed, false, 'pressed reset on mouseup');

            // Move with which !== 1 ends an active press (e.g. released outside window)
            calls = [];
            input.handler({type: 'mousedown', button: 0, which: 1, clientX: 10, clientY: 10});
            input.handler({type: 'mousemove', button: 0, which: 0, clientX: 20, clientY: 20});
            equal(calls.length, 2, 'start and synthetic end dispatched');
            equal(calls[1].type, $H.INPUT_END, 'mousemove with which !== 1 converted to INPUT_END');
            equal(input.pressed, false, 'pressed reset when which !== 1');
        } finally {
            input.destroy();
        }
    });

    test('MouseInput accepts standard MouseEvent buttons bitmask when ev.which is 0', function() {
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

            deepEqual(
                calls,
                [$H.INPUT_START, $H.INPUT_MOVE, $H.INPUT_MOVE, $H.INPUT_END],
                'mousemove with primary button bit in ev.buttons stays INPUT_MOVE and buttons === 0 ends gesture'
            );
            equal(input.pressed, false, 'pressed reset once ev.buttons drops primary button');
        } finally {
            input.destroy();
        }
    });

    test('Manager options.inputClass uses custom input class', function() {
        manager = new Hammer.Manager(el, {
            inputClass: Hammer.MouseInput,
            recognizers: [[Hammer.Tap]]
        });
        ok(manager.input instanceof Hammer.MouseInput, 'Manager instantiates specified inputClass');
    });

    test('PointerEventInput handles lifecycle, multi-pointer, cancel, and IE10 enums', function() {
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
            equal(calls.length, 0, 'hover pointermove ignored');

            // Right-button mouse pointerdown is ignored
            input.handler({type: 'pointerdown', pointerId: 1, pointerType: 'mouse', button: 2, clientX: 10, clientY: 10});
            equal(calls.length, 0, 'non-left mouse pointerdown ignored');

            // Mouse left-button lifecycle
            input.handler({type: 'pointerdown', pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10});
            input.handler({type: 'pointermove', pointerId: 1, pointerType: 'mouse', button: 0, clientX: 25, clientY: 25});
            input.handler({type: 'pointerup', pointerId: 1, pointerType: 'mouse', button: 0, clientX: 25, clientY: 25});

            equal(calls.length, 3, 'mouse pointerdown/move/up dispatched');
            equal(calls[0].type, $H.INPUT_START, 'pointerdown maps to INPUT_START');
            equal(calls[1].type, $H.INPUT_MOVE, 'pointermove maps to INPUT_MOVE');
            equal(calls[2].type, $H.INPUT_END, 'pointerup maps to INPUT_END');
            equal(input.store.length, 0, 'pointer removed from store after pointerup');

            // Multi-touch + IE10 MS-prefixed events and numeric pointerType enums
            calls = [];
            input.handler({type: 'MSPointerDown', pointerId: 10, pointerType: 2, button: -1, clientX: 10, clientY: 10});
            input.handler({type: 'MSPointerDown', pointerId: 11, pointerType: 3, button: 0, clientX: 50, clientY: 50});
            equal(input.store.length, 2, 'both pointers tracked in store');
            equal(calls[0].pointerType, $H.INPUT_TYPE_TOUCH, 'IE10 enum 2 normalized to touch');
            equal(calls[1].pointerType, $H.INPUT_TYPE_PEN, 'IE10 enum 3 normalized to pen');

            // Cancel first pointer, release second via pointerout
            input.handler({type: 'MSPointerCancel', pointerId: 10, pointerType: 2, clientX: 10, clientY: 10});
            equal(calls[2].type, $H.INPUT_CANCEL, 'MSPointerCancel maps to INPUT_CANCEL');
            equal(input.store.length, 1, 'cancelled pointer removed from store');

            input.handler({type: 'pointerout', pointerId: 11, pointerType: 3, clientX: 50, clientY: 50});
            equal(calls[3].type, $H.INPUT_CANCEL, 'pointerout maps to INPUT_CANCEL');
            equal(input.store.length, 0, 'store empty after all pointers removed');

            // Unknown pointerup is ignored
            calls = [];
            input.handler({type: 'pointerup', pointerId: 99, pointerType: 'touch', clientX: 0, clientY: 0});
            equal(calls.length, 0, 'pointerup for untracked pointerId ignored');
        } finally {
            input.destroy();
        }
    });

    test('PointerEventInput ends stuck mouse pointer when ev.buttons === 0 and clears store on destroy', function() {
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

            deepEqual(
                calls,
                [$H.INPUT_START, $H.INPUT_MOVE, $H.INPUT_END],
                'mouse pointermove with buttons === 0 converts to INPUT_END and stops subsequent hover events'
            );
            equal(input.store.length, 0, 'stuck mouse pointer removed from store');

            // destroy() clears active pointers from store
            input.handler({type: 'pointerdown', pointerId: 2, pointerType: 'touch', button: 0, clientX: 15, clientY: 15});
            equal(input.store.length, 1, 'touch pointer stored while active');
            input.destroy();
            equal(input.store.length, 0, 'destroy() clears pointer store');
        } finally {
            input.destroy();
        }
    });

    test('SingleTouchInput handles start, move, multi-touch end, cancel, and pre-start ignore', function() {
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
            equal(calls.length, 0, 'touchmove ignored before touchstart');

            // Start with finger 1, add finger 2, move, lift finger 2 (still started), lift finger 1 (ends)
            input.handler({type: 'touchstart', touches: [t1], changedTouches: [t1]});
            equal(input.started, true, 'started set to true on touchstart');

            input.handler({type: 'touchstart', touches: [t1, t2], changedTouches: [t2]});
            input.handler({type: 'touchmove', touches: [t1, t2], changedTouches: [t1, t2]});
            input.handler({type: 'touchend', touches: [t1], changedTouches: [t2]});
            equal(input.started, true, 'started remains true while another touch is still active');
            equal(calls[3].pointersLen, 2, 'normalizeSingleTouches merges active and ended touches');

            input.handler({type: 'touchend', touches: [], changedTouches: [t1]});
            equal(input.started, false, 'started reset when final touch ends');
            equal(calls[4].type, $H.INPUT_END, 'final touchend dispatched as INPUT_END');
            equal(calls[4].pointerType, $H.INPUT_TYPE_TOUCH, 'pointerType is touch');

            // Cancel resets started
            calls = [];
            input.handler({type: 'touchstart', touches: [t1], changedTouches: [t1]});
            input.handler({type: 'touchcancel', touches: [], changedTouches: [t1]});
            equal(input.started, false, 'started reset on touchcancel');
            equal(calls[1].type, $H.INPUT_CANCEL, 'touchcancel dispatched as INPUT_CANCEL');
        } finally {
            input.destroy();
        }
    });

    test('TouchInput isolates multi-user touches by target and ignores untracked touchend', function() {
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
            equal(calls.length, 0, 'touchend for untracked identifier does not invoke callback');

            // Multi-touch with one touch on child of target and one on unrelated element
            var ownTouch = {identifier: 1, clientX: 20, clientY: 20, target: childEl};
            var otherTouch = {identifier: 2, clientX: 80, clientY: 80, target: otherEl};
            input.handler({
                type: 'touchstart',
                touches: [ownTouch, otherTouch],
                changedTouches: [ownTouch, otherTouch]
            });
            equal(calls.length, 1, 'touchstart dispatches for touch on target subtree');
            equal(calls[0].pointers.length, 1, 'only target touch included in pointers');
            equal(calls[0].pointers[0].identifier, 1, 'foreign element touch filtered out');
        } finally {
            input.destroy();
        }
    });

    test('TouchInput retains already-tracked touches when their child target is detached mid-gesture', function() {
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
            equal(calls[0].pointers.length, 2, 'both touches tracked on touchstart');

            // Remove childEl from DOM while both touches remain active
            el.removeChild(childEl);

            // Second finger moves; first finger (whose target is now detached) must stay in pointers
            input.handler({type: 'touchmove', touches: [t1, t2], changedTouches: [t2]});
            equal(calls[1].pointers.length, 2, 'tracked touch on detached child stays in pointers during touchmove');
        } finally {
            input.destroy();
        }
    });

    test('TouchMouseInput deduplicates synthetic mouse events near recent touches and forwards distant mouse events', function() {
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
            equal(calls.length, 2, 'touch events forwarded');

            // Synthetic mouse event within DEDUP_DISTANCE (25px) should be suppressed
            input.handler(manager, $H.INPUT_START, {
                pointerType: $H.INPUT_TYPE_MOUSE,
                pointers: [{clientX: 110, clientY: 110}],
                changedPointers: [{clientX: 110, clientY: 110}],
                srcEvent: {clientX: 110, clientY: 110}
            });
            equal(calls.length, 2, 'synthetic mouse event within 25px suppressed');

            // Genuine mouse event far away (> 25px) should pass through
            input.handler(manager, $H.INPUT_START, {
                pointerType: $H.INPUT_TYPE_MOUSE,
                pointers: [{clientX: 250, clientY: 250}],
                changedPointers: [{clientX: 250, clientY: 250}],
                srcEvent: {clientX: 250, clientY: 250}
            });
            equal(calls.length, 3, 'distant mouse event forwarded');
            equal(calls[2].pointerType, $H.INPUT_TYPE_MOUSE, 'forwarded event keeps mouse pointerType');
        } finally {
            input.destroy();
        }
    });

    test('TouchMouseInput rebinds touch and mouse listeners when Manager.set updates inputTarget', function() {
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
        strictEqual(manager.input.touch.target, newTarget, 'child TouchInput target updated');
        strictEqual(manager.input.mouse.target, newTarget, 'child MouseInput target updated');

        // Old target no longer triggers tap
        utils.dispatchTouchEvent(el, 'start', 50, 50);
        utils.dispatchTouchEvent(el, 'end', 50, 50);
        equal(tapCount, 0, 'old inputTarget no longer triggers tap');

        // New target triggers tap
        utils.dispatchTouchEvent(newTarget, 'start', 50, 50);
        utils.dispatchTouchEvent(newTarget, 'end', 50, 50);
        equal(tapCount, 1, 'new inputTarget triggers tap after set({inputTarget})');
    });

    test('Input domHandler ignores events if manager was destroyed during the same dispatch', function() {
        expect(1);

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
        ok(true, 'domHandler does not throw after manager.destroy()');
        manager = null;
    });

    test('Manager options.pointerTypes filters disallowed pointer types across input drivers', function() {
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
            equal(calls.length, 0, 'mouse events ignored when pointerTypes is ["touch"]');
            equal(pe.store.length, 0, 'ignored mouse pointer never enters PointerEventInput.store');
            equal(mi.pressed, false, 'ignored mouse event never sets MouseInput.pressed');

            // Touch events are accepted
            pe.handler({type: 'pointerdown', pointerId: 2, pointerType: 'touch', button: 0, clientX: 10, clientY: 10});
            pe.handler({type: 'pointerup', pointerId: 2, pointerType: 'touch', button: 0, clientX: 10, clientY: 10});
            equal(calls.length, 2, 'touch events accepted when pointerTypes is ["touch"]');

            // Updating pointerTypes via Manager.set()
            calls = [];
            manager.set({pointerTypes: ['touch', 'pen']});
            pe.handler({type: 'pointerdown', pointerId: 3, pointerType: 'pen', button: 0, clientX: 10, clientY: 10});
            pe.handler({type: 'pointerup', pointerId: 3, pointerType: 'pen', button: 0, clientX: 10, clientY: 10});
            pe.handler({type: 'pointerdown', pointerId: 4, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10});
            equal(calls.length, 2, 'pen accepted and mouse rejected with pointerTypes: ["touch", "pen"]');
            equal(calls[0].pointerType, $H.INPUT_TYPE_PEN, 'pen pointerType preserved');

            // Empty pointerType never matches
            equal($H.isAllowedPointerType(manager, ''), false, 'empty pointerType rejected');

            // TouchInput and SingleTouchInput short-circuit before mutating state when touch is disallowed
            calls = [];
            manager.set({pointerTypes: ['mouse']});
            var touchObj = {identifier: 7, clientX: 10, clientY: 10, target: el};
            ti.handler({type: 'touchstart', touches: [touchObj], changedTouches: [touchObj], target: el});
            sti.handler({type: 'touchstart', touches: [touchObj], changedTouches: [touchObj], target: el});
            equal(calls.length, 0, 'TouchInput and SingleTouchInput ignore touch when pointerTypes is ["mouse"]');
            equal(ti.targetIds[7], undefined, 'TouchInput does not record targetIds for disallowed touch');
            equal(sti.started, false, 'SingleTouchInput does not set started for disallowed touch');

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
            equal(inputEvents.length, 0, 'inputHandler drops disallowed pointerType');
        } finally {
            pe.destroy();
            mi.destroy();
            ti.destroy();
            sti.destroy();
        }
    });
})();
