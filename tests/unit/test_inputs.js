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
            equal(calls.length, 4, 'mouse event passes once dedup timestamp expires');
            equal(input.lastTouches.length, 0, 'expired lastTouches entries pruned');
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

    test('PointerEventInput prunes leaked pointers on primary pointerdown and cancels on blur', function() {
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
            equal(input.store.length, 2, 'leaked touch 11 and active pen 20 are in store');

            // New primary touchstart evicts leaked touch 11 without touching pen 20
            calls = [];
            input.handler({type: 'pointerdown', pointerId: 12, pointerType: 'touch', isPrimary: true, button: 0, clientX: 70, clientY: 70});
            equal(input.store.length, 2, 'leaked touch evicted, active pen preserved, new touch stored');
            equal(input.store[0].pointerId, 20, 'pen pointer remains in store');
            equal(input.store[1].pointerId, 12, 'new primary touch stored');

            // Non-primary secondary touch does not evict existing touch
            input.handler({type: 'pointerdown', pointerId: 13, pointerType: 'touch', isPrimary: false, button: 0, clientX: 90, clientY: 90});
            equal(input.store.length, 3, 'secondary touch appends normally');

            // Window blur cancels all active pointers even when pointerTypes is restricted
            calls = [];
            input.handler({type: 'blur'});
            equal(input.store.length, 0, 'blur clears pointer store');
            equal(calls.length, 1, 'blur emits one INPUT_CANCEL');
            equal(calls[0].type, $H.INPUT_CANCEL, 'blur maps to INPUT_CANCEL');
            equal(calls[0].pointersLen, 3, 'all cancelled pointers passed in pointers');
            equal(calls[0].changedLen, 3, 'changedPointers matches pointers so isFinal is true');
            equal(calls[0].x, 50, 'stored pointer coordinates preserved for cancel event');

            // Subsequent blur with empty store is a no-op
            calls = [];
            input.handler({type: 'blur'});
            equal(calls.length, 0, 'blur ignored when no pointers are active');
        } finally {
            input.destroy();
        }
    });

    asyncTest('PointerEventInput blur cancels active Pan and pending Press without NaN coordinates', function() {
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

        equal(events.length, 2, 'panstart and pancancel fired');
        equal(events[0].type, 'panstart', 'pan started');
        equal(events[1].type, 'pancancel', 'blur emitted pancancel');
        equal(events[1].isFinal, true, 'blur cancel marks session as isFinal');
        equal(events[1].x, 30, 'cancel center.x stays finite from last pointer');
        equal(events[1].y, 20, 'cancel center.y stays finite from last pointer');

        // Pending press (without moving past threshold) is cancelled on blur
        manager.input.handler({type: 'pointerdown', pointerId: 2, pointerType: 'touch', isPrimary: true, button: 0, clientX: 10, clientY: 20, target: el});
        manager.input.handler({type: 'blur', target: window});

        setTimeout(function() {
            equal(pressCount, 0, 'blur cancelled pending press timer');
            start();
        }, 60);
    });

    test('MouseInput cancels active press on blur and TouchInput resets leaked targetIds on single touchstart', function() {
        var mouseCalls = [];
        manager = new Hammer.Manager(el, {recognizers: []});
        var mi = new $H.MouseInput(manager, function(mgr, type, data) {
            mouseCalls.push({type: type, x: data.pointers[0].clientX});
        });
        var ti = new $H.TouchInput(manager, function() {});

        try {
            // Blur while not pressed does nothing
            mi.handler({type: 'blur'});
            equal(mouseCalls.length, 0, 'blur ignored when mouse not pressed');

            // Active mouse drag cancelled on blur with last mouse coordinates
            mi.handler({type: 'mousedown', button: 0, which: 1, clientX: 15, clientY: 25});
            mi.handler({type: 'mousemove', button: 0, which: 1, clientX: 40, clientY: 25});
            mi.handler({type: 'blur'});
            equal(mi.pressed, false, 'MouseInput.pressed reset on blur');
            equal(mi.lastEv, null, 'MouseInput.lastEv cleared on blur');
            equal(mouseCalls[2].type, $H.INPUT_CANCEL, 'MouseInput emits INPUT_CANCEL on blur');
            equal(mouseCalls[2].x, 40, 'MouseInput cancel preserves last pointer coordinates');

            // TouchInput clears leaked targetIds when a fresh single-finger touchstart arrives
            var t1 = {identifier: 1, clientX: 10, clientY: 10, target: el};
            var t2 = {identifier: 2, clientX: 20, clientY: 20, target: el};
            var t3 = {identifier: 3, clientX: 30, clientY: 30, target: el};
            ti.handler({type: 'touchstart', touches: [t1], changedTouches: [t1]});
            equal(ti.targetIds[1], true, 'initial touch id tracked');

            // Finger 1 dropped without touchend; new single touchstart with finger 2 resets targetIds
            ti.handler({type: 'touchstart', touches: [t2], changedTouches: [t2]});
            equal(ti.targetIds[1], undefined, 'leaked touch id purged on fresh single touchstart');
            equal(ti.targetIds[2], true, 'new touch id tracked');

            // Adding a second simultaneous finger keeps existing targetIds
            ti.handler({type: 'touchstart', touches: [t2, t3], changedTouches: [t3]});
            equal(ti.targetIds[2], true, 'existing touch id retained during multi-touch start');
            equal(ti.targetIds[3], true, 'second touch id tracked');
        } finally {
            mi.destroy();
            ti.destroy();
        }
    });

    test('fresh primary pointerdown resets active Pan state after a leaked pointer', function() {
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
        deepEqual(events, ['panstart'], 'pan started on first pointer');

        // Fresh primary tap must reset stuck Pan state instead of firing panmove on pointerdown
        events = [];
        manager.input.handler({type: 'pointerdown', pointerId: 2, pointerType: 'touch', isPrimary: true, button: 0, clientX: 10, clientY: 10, target: el});
        manager.input.handler({type: 'pointerup', pointerId: 2, pointerType: 'touch', isPrimary: true, button: 0, clientX: 10, clientY: 10, target: el});
        deepEqual(events, ['tap'], 'subsequent tap succeeds without bogus panmove');
    });
})();
