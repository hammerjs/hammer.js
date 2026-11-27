(function() {
    var el, manager;

    module('Core Coverage (Manager & Recognizers)', {
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

    test('Manager.set updates touchAction and rebinds inputTarget', function() {
        var newTarget = utils.createHitArea();
        manager = new Hammer.Manager(el, {recognizers: [[Hammer.Tap]]});

        manager.set({touchAction: 'none'});
        equal(manager.touchAction.actions, 'none', 'set({touchAction}) updates touchAction');

        manager.set({inputTarget: newTarget});
        equal(manager.input.target, newTarget, 'set({inputTarget}) rebinds input target');
    });

    test('Manager.stop and forced stop halt recognition', function() {
        var events = [];
        manager = new Hammer.Manager(el, {
            recognizers: [
                [Hammer.Pan, {event: 'pan1', threshold: 1}],
                [Hammer.Pan, {event: 'pan2', threshold: 1}, ['pan1']]
            ]
        });

        manager.on('pan1start', function() {
            events.push('pan1start');
            manager.stop(true);
        });
        manager.on('pan2start', function() {
            events.push('pan2start');
        });

        var baseInput = {
            eventType: $H.INPUT_MOVE,
            pointers: [{clientX: 20, clientY: 0}],
            changedPointers: [{clientX: 20, clientY: 0}],
            maxPointers: 1,
            distance: 20,
            deltaX: 20,
            deltaY: 0,
            deltaTime: 50,
            direction: Hammer.DIRECTION_RIGHT,
            offsetDirection: Hammer.DIRECTION_RIGHT,
            srcEvent: {cancelable: true, preventDefault: function() {}}
        };

        // Forced stop inside pan1start stops pan2 in the same recognize() cycle
        manager.recognize(baseInput);
        deepEqual(events, ['pan1start'], 'stop(true) halts remaining recognizers immediately');

        // Subsequent recognize() calls are ignored while session.stopped is set
        manager.recognize(baseInput);
        deepEqual(events, ['pan1start'], 'recognize() exits early when session is stopped');

        // Non-forced stop sets STOP flag
        manager.session = {};
        manager.stop();
        equal(manager.session.stopped, $H.STOP, 'stop() sets STOP flag on session');
    });

    test('Manager.remove array arg, missing on/off args, emit preventDefault, and destroy CSS restore', function() {
        el.style.userSelect = 'text';
        manager = new Hammer.Manager(el, {
            recognizers: [[Hammer.Tap], [Hammer.Press]]
        });

        // Remove multiple recognizers via array and ignore unknown name
        manager.remove(['tap', 'press']);
        equal(manager.recognizers.length, 0, 'remove() accepts array of recognizer names');
        manager.remove('doesnotexist');
        equal(manager.recognizers.length, 0, 'remove() ignores unknown recognizer');

        // on() and off() safely ignore undefined arguments
        equal(manager.on(undefined, function() {}), undefined, 'on(undefined) returns early');
        equal(manager.on('tap', undefined), undefined, 'on(events, undefined) returns early');
        equal(manager.off(undefined), undefined, 'off(undefined) returns early');

        // emit() exposes data.preventDefault() delegating to srcEvent.preventDefault()
        var srcPrevented = false;
        manager.on('custom', function(ev) {
            ev.preventDefault();
        });
        manager.emit('custom', {
            srcEvent: {
                preventDefault: function() {
                    srcPrevented = true;
                }
            }
        });
        equal(srcPrevented, true, 'emitted event preventDefault() delegates to srcEvent');

        // emit() with domEvents: true dispatches a DOM Event carrying .gesture
        var domEv = null;
        var domListener = function(e) {
            domEv = e;
        };
        el.addEventListener('customdom', domListener, false);
        manager.set({domEvents: true});
        manager.emit('customdom', {
            target: el,
            srcEvent: {preventDefault: function() {}}
        });
        el.removeEventListener('customdom', domListener, false);
        ok(domEv && domEv.type === 'customdom' && domEv.gesture && domEv.gesture.target === el,
            'domEvents: true dispatches DOM event with gesture payload');

        // Manager handles target without .style (e.g. document) without throwing
        var docManager = new Hammer.Manager(document, {recognizers: []});
        ok(docManager instanceof Hammer.Manager, 'Manager works on document without .style');
        docManager.destroy();

        // destroy() restores inline cssProps and clears element
        var userSelectProp = $H.prefixed(el.style, 'userSelect');
        manager.destroy();
        equal(manager.element, null, 'destroy() clears element reference');
        if (userSelectProp) {
            equal(el.style[userSelectProp], 'text', 'destroy() restores previous inline cssProps value');
        }
        manager = null;
    });

    test('Recognizer dropRequireFailure, dropRecognizeWith array, stateStr, directionStr, and AttrRecognizer cancel', function() {
        manager = new Hammer.Manager(el, {recognizers: []});
        var tap = manager.add(new Hammer.Tap({event: 'tap'}));
        var doubletap = manager.add(new Hammer.Tap({event: 'doubletap', taps: 2}));
        var press = manager.add(new Hammer.Press());

        tap.requireFailure([doubletap, press]);
        equal(tap.hasRequireFailures(), true, 'requireFailure registered');

        tap.dropRequireFailure('doubletap');
        equal(tap.requireFail.length, 1, 'dropRequireFailure removes link by name');

        tap.dropRequireFailure([press]);
        equal(tap.hasRequireFailures(), false, 'dropRequireFailure accepts array argument');

        tap.recognizeWith([doubletap, press]);
        equal(tap.canRecognizeWith(doubletap), true, 'recognizeWith registered doubletap');
        equal(tap.canRecognizeWith(press), true, 'recognizeWith registered press');

        tap.dropRecognizeWith([doubletap, press]);
        equal(tap.canRecognizeWith(doubletap), false, 'dropRecognizeWith array removed doubletap');
        equal(tap.canRecognizeWith(press), false, 'dropRecognizeWith array removed press');

        // stateStr & directionStr coverage
        equal($H.stateStr($H.STATE_CANCELLED), 'cancel', 'STATE_CANCELLED -> cancel');
        equal($H.stateStr($H.STATE_ENDED), 'end', 'STATE_ENDED -> end');
        equal($H.stateStr($H.STATE_CHANGED), 'move', 'STATE_CHANGED -> move');
        equal($H.stateStr($H.STATE_BEGAN), 'start', 'STATE_BEGAN -> start');
        equal($H.stateStr($H.STATE_POSSIBLE), '', 'STATE_POSSIBLE -> empty string');

        equal($H.directionStr(Hammer.DIRECTION_DOWN), 'down', 'DIRECTION_DOWN -> down');
        equal($H.directionStr(Hammer.DIRECTION_UP), 'up', 'DIRECTION_UP -> up');
        equal($H.directionStr(Hammer.DIRECTION_LEFT), 'left', 'DIRECTION_LEFT -> left');
        equal($H.directionStr(Hammer.DIRECTION_RIGHT), 'right', 'DIRECTION_RIGHT -> right');
        equal($H.directionStr(Hammer.DIRECTION_NONE), '', 'DIRECTION_NONE -> empty string');

        // AttrRecognizer transitions to STATE_CANCELLED on INPUT_CANCEL after beginning
        var pan = manager.add(new Hammer.Pan({threshold: 1}));
        var emitted = [];
        manager.on('panstart pancancel', function(ev) {
            emitted.push(ev.type);
        });

        var srcEv = {cancelable: true, preventDefault: function() {}};
        pan.recognize({
            eventType: $H.INPUT_MOVE,
            pointers: [{}],
            distance: 15,
            deltaX: 15,
            deltaY: 0,
            direction: Hammer.DIRECTION_RIGHT,
            srcEvent: srcEv
        });
        pan.recognize({
            eventType: $H.INPUT_CANCEL,
            pointers: [{}],
            distance: 15,
            deltaX: 15,
            deltaY: 0,
            direction: Hammer.DIRECTION_RIGHT,
            srcEvent: srcEv
        });
        deepEqual(emitted, ['panstart', 'pancancel'], 'AttrRecognizer emits cancel event on INPUT_CANCEL');
    });

    test('PanRecognizer vertical axis locking, SwipeRecognizer directions, Pinch/Rotate/Press edge paths', function() {
        manager = new Hammer.Manager(el, {recognizers: []});

        // Vertical Pan axis locking (hits vertical branch in directionTest)
        var vpan = manager.add(new Hammer.Pan({direction: Hammer.DIRECTION_VERTICAL, threshold: 5}));
        var panEvents = [];
        manager.on('panstart panup pandown panend', function(ev) {
            panEvents.push(ev.type);
        });

        var srcEv = {cancelable: true, preventDefault: function() {}};
        // Predominantly horizontal direction, but deltaY exceeds threshold -> vertical lock triggers
        vpan.recognize({
            eventType: $H.INPUT_MOVE,
            pointers: [{}],
            distance: 30,
            deltaX: 25,
            deltaY: -12,
            direction: Hammer.DIRECTION_RIGHT,
            srcEvent: srcEv
        });
        vpan.recognize({
            eventType: $H.INPUT_MOVE,
            pointers: [{}],
            distance: 35,
            deltaX: 30,
            deltaY: 18,
            direction: Hammer.DIRECTION_RIGHT,
            srcEvent: srcEv
        });
        vpan.recognize({
            eventType: $H.INPUT_END,
            pointers: [{}],
            distance: 35,
            deltaX: 30,
            deltaY: 18,
            direction: Hammer.DIRECTION_DOWN,
            srcEvent: srcEv
        });
        deepEqual(panEvents, ['panstart', 'panup', 'pandown', 'panend'], 'vertical Pan locks to Y axis and emits panup/pandown');

        // SwipeRecognizer vertical & horizontal directions
        var swipe = manager.add(new Hammer.Swipe({direction: Hammer.DIRECTION_ALL, threshold: 10, velocity: 0.3}));
        var swipeEvents = [];
        manager.on('swipeup swipedown swipeleft swiperight', function(ev) {
            swipeEvents.push(ev.type);
        });
        [Hammer.DIRECTION_UP, Hammer.DIRECTION_DOWN, Hammer.DIRECTION_LEFT, Hammer.DIRECTION_RIGHT].forEach(function(dir) {
            var vx = (dir === Hammer.DIRECTION_LEFT) ? -1.0 : (dir === Hammer.DIRECTION_RIGHT) ? 1.0 : 0;
            var vy = (dir === Hammer.DIRECTION_UP) ? -1.0 : (dir === Hammer.DIRECTION_DOWN) ? 1.0 : 0;
            var v = vx || vy;
            swipe.recognize({
                eventType: $H.INPUT_END,
                pointers: [{}],
                maxPointers: 1,
                distance: 40,
                velocity: v,
                velocityX: vx,
                velocityY: vy,
                overallVelocity: v,
                overallVelocityX: vx,
                overallVelocityY: vy,
                offsetDirection: dir,
                srcEvent: srcEv
            });
        });
        deepEqual(swipeEvents, ['swipeup', 'swipedown', 'swipeleft', 'swiperight'], 'Swipe emits all 4 directional events');

        // PinchRecognizer pinchout & pinchin
        var pinch = manager.add(new Hammer.Pinch({enable: true, threshold: 0.1}));
        var pinchEvents = [];
        manager.on('pinchstart pinchout pinchin pinchend', function(ev) {
            pinchEvents.push(ev.type);
        });
        pinch.recognize({eventType: $H.INPUT_MOVE, pointers: [{}, {}], scale: 1.5, srcEvent: srcEv});
        pinch.recognize({eventType: $H.INPUT_MOVE, pointers: [{}, {}], scale: 0.6, srcEvent: srcEv});
        pinch.recognize({eventType: $H.INPUT_END, pointers: [{}, {}], scale: 0.6, srcEvent: srcEv});
        deepEqual(pinchEvents, ['pinchstart', 'pinchout', 'pinchin', 'pinchin', 'pinchend'], 'Pinch emits start, out, in, end');

        // RotateRecognizer threshold & events
        var rotate = manager.add(new Hammer.Rotate({enable: true, threshold: 5}));
        var rotateEvents = [];
        manager.on('rotatestart rotatemove rotateend', function(ev) {
            rotateEvents.push(ev.type);
        });
        rotate.recognize({eventType: $H.INPUT_MOVE, pointers: [{}, {}], rotation: 2, srcEvent: srcEv});
        equal(rotateEvents.length, 0, 'Rotate does not trigger below threshold');
        rotate.recognize({eventType: $H.INPUT_MOVE, pointers: [{}, {}], rotation: 15, srcEvent: srcEv});
        rotate.recognize({eventType: $H.INPUT_MOVE, pointers: [{}, {}], rotation: 25, srcEvent: srcEv});
        rotate.recognize({eventType: $H.INPUT_END, pointers: [{}, {}], rotation: 25, srcEvent: srcEv});
        deepEqual(rotateEvents, ['rotatestart', 'rotatemove', 'rotateend'], 'Rotate emits start, move, end above threshold');

        // PressRecognizer emit guard when not recognized + pressup after recognized press
        var press = manager.add(new Hammer.Press({time: 0, threshold: 9}));
        var pressEvents = [];
        manager.on('press pressup', function(ev) {
            pressEvents.push(ev.type);
        });
        press.state = $H.STATE_FAILED;
        press.emit({eventType: $H.INPUT_END, srcEvent: srcEv});
        equal(pressEvents.length, 0, 'Press.emit does nothing when state !== STATE_RECOGNIZED');

        press.recognize({
            eventType: $H.INPUT_START,
            pointers: [{}],
            distance: 0,
            deltaTime: 0,
            srcEvent: srcEv
        });
        press.recognize({
            eventType: $H.INPUT_END,
            pointers: [{}],
            distance: 2,
            deltaTime: 300,
            srcEvent: srcEv
        });
        deepEqual(pressEvents, ['press', 'pressup'], 'Press emits pressup when released after press was recognized');
    });

    test('AttrRecognizer does not emit start or move when INPUT_CANCEL arrives before recognition', function() {
        manager = new Hammer.Manager(el, {recognizers: []});
        var pan = manager.add(new Hammer.Pan({threshold: 1}));
        var emitted = [];
        manager.on('panstart panmove panend pancancel', function(ev) {
            emitted.push(ev.type);
        });

        var srcEv = {cancelable: true, preventDefault: function() {}};
        pan.recognize({
            eventType: $H.INPUT_CANCEL,
            isFinal: true,
            pointers: [{}],
            distance: 20,
            deltaX: 20,
            deltaY: 0,
            direction: Hammer.DIRECTION_RIGHT,
            srcEvent: srcEv
        });
        deepEqual(emitted, [], 'INPUT_CANCEL before recognition emits no pan events');
        equal(pan.state, $H.STATE_FAILED, 'recognizer transitions to STATE_FAILED');
    });

    test('AttrRecognizer does not emit orphan end events on 1-frame gestures while Swipe still recognizes on INPUT_END', function() {
        manager = new Hammer.Manager(el, {
            recognizers: [
                [Hammer.Pan, {threshold: 10}],
                [Hammer.Pinch, {enable: true, threshold: 0.1}],
                [Hammer.Rotate, {enable: true, threshold: 5}],
                [Hammer.Swipe, {direction: Hammer.DIRECTION_HORIZONTAL, threshold: 10, velocity: 0.3}, ['pan']]
            ]
        });

        var panEvents = [];
        var pinchEvents = [];
        var rotateEvents = [];
        var swipeEvents = [];

        manager.on('panstart panmove panend pancancel', function(ev) {
            panEvents.push(ev.type);
        });
        manager.on('pinchstart pinchmove pinchend pinchcancel', function(ev) {
            pinchEvents.push(ev.type);
        });
        manager.on('rotatestart rotatemove rotateend rotatecancel', function(ev) {
            rotateEvents.push(ev.type);
        });
        manager.on('swipe swiperight', function(ev) {
            swipeEvents.push(ev.type);
        });

        var srcEv = {cancelable: true, preventDefault: function() {}, target: el};

        // 1-frame Pan + Swipe: INPUT_START (0,0) -> INPUT_END (30,0) with no intervening INPUT_MOVE
        manager.recognize({
            eventType: $H.INPUT_START,
            pointers: [{clientX: 0, clientY: 0}],
            changedPointers: [{clientX: 0, clientY: 0}],
            maxPointers: 1,
            distance: 0,
            deltaX: 0,
            deltaY: 0,
            direction: Hammer.DIRECTION_NONE,
            offsetDirection: Hammer.DIRECTION_NONE,
            velocity: 0,
            velocityX: 0,
            velocityY: 0,
            srcEvent: srcEv
        });
        manager.recognize({
            eventType: $H.INPUT_END,
            pointers: [{clientX: 30, clientY: 0}],
            changedPointers: [{clientX: 30, clientY: 0}],
            maxPointers: 1,
            distance: 30,
            deltaX: 30,
            deltaY: 0,
            direction: Hammer.DIRECTION_RIGHT,
            offsetDirection: Hammer.DIRECTION_RIGHT,
            velocity: 1.5,
            velocityX: 1.5,
            velocityY: 0,
            srcEvent: srcEv
        });
        deepEqual(panEvents, [], '1-frame pan does not emit orphan panend without panstart');
        deepEqual(swipeEvents, ['swiperight', 'swipe'], 'SwipeRecognizer still recognizes 1-frame flick on INPUT_END');

        // 1-frame Pinch and Rotate directly on INPUT_END without prior start
        manager.get('pinch').recognize({eventType: $H.INPUT_END, pointers: [{}, {}], scale: 2.0, srcEvent: srcEv});
        manager.get('rotate').recognize({eventType: $H.INPUT_END, pointers: [{}, {}], rotation: 45, srcEvent: srcEv});
        deepEqual(pinchEvents, [], '1-frame pinch does not emit orphan pinchend without pinchstart');
        deepEqual(rotateEvents, [], '1-frame rotate does not emit orphan rotateend without rotatestart');
    });

    asyncTest('PressRecognizer clears timer on INPUT_END and INPUT_CANCEL even when deltaTime exceeds time', function() {
        expect(2);

        manager = new Hammer.Manager(el, {recognizers: []});
        var press = manager.add(new Hammer.Press({time: 20}));
        var events = [];
        manager.on('press pressup', function(ev) {
            events.push(ev.type);
        });

        var srcEv = {cancelable: true, preventDefault: function() {}};

        // Case 1: INPUT_END arrives with deltaTime > time before timer callback runs
        press.recognize({eventType: $H.INPUT_START, pointers: [{}], distance: 0, deltaTime: 0, srcEvent: srcEv});
        press.recognize({eventType: $H.INPUT_END, pointers: [{}], distance: 0, deltaTime: 30, srcEvent: srcEv});
        deepEqual(events, [], 'pressup is not emitted if press timer did not fire before end');

        // Case 2: INPUT_CANCEL arrives with deltaTime > time before timer callback runs
        press.recognize({eventType: $H.INPUT_START, pointers: [{}], distance: 0, deltaTime: 0, srcEvent: srcEv});
        press.recognize({eventType: $H.INPUT_CANCEL, pointers: [{}], distance: 0, deltaTime: 30, srcEvent: srcEv});

        setTimeout(function() {
            deepEqual(events, [], 'no stale press event fires after end or cancel');
            start();
        }, 60);
    });

    test('PressRecognizer does not emit pressup if movement invalidated the press before release', function() {
        manager = new Hammer.Manager(el, {recognizers: []});
        var press = manager.add(new Hammer.Press({time: 20, threshold: 9}));
        var events = [];
        manager.on('press pressup', function(ev) {
            events.push(ev.type);
        });

        var srcEv = {cancelable: true, preventDefault: function() {}};
        press.recognize({eventType: $H.INPUT_START, pointers: [{}], distance: 0, deltaTime: 0, srcEvent: srcEv});
        // Move past threshold (cancels pending press), then return within threshold after time elapsed
        press.recognize({eventType: $H.INPUT_MOVE, pointers: [{}], distance: 25, deltaTime: 10, srcEvent: srcEv});
        press.recognize({eventType: $H.INPUT_MOVE, pointers: [{}], distance: 2, deltaTime: 30, srcEvent: srcEv});
        press.recognize({eventType: $H.INPUT_END, pointers: [{}], distance: 2, deltaTime: 40, srcEvent: srcEv});

        deepEqual(events, [], 'pressup is not emitted after movement invalidated the press');

        // Second finger cancels pending press; lifting second finger (isFinal: false) must keep press invalidated
        press.recognize({eventType: $H.INPUT_START, isFirst: true, isFinal: false, pointers: [{}], distance: 0, deltaTime: 0, srcEvent: srcEv});
        press.recognize({eventType: $H.INPUT_START, isFirst: false, isFinal: false, pointers: [{}, {}], distance: 2, deltaTime: 5, srcEvent: srcEv});
        press.recognize({eventType: $H.INPUT_END, isFirst: false, isFinal: false, pointers: [{}, {}], distance: 2, deltaTime: 10, srcEvent: srcEv});
        press.recognize({eventType: $H.INPUT_END, isFirst: false, isFinal: true, pointers: [{}], distance: 0, deltaTime: 40, srcEvent: srcEv});

        deepEqual(events, [], 'pressup is not emitted after a second pointer invalidated the press');
    });

    test('Manager.emit populates data.type and data.preventDefault before dispatching DOM events', function() {
        expect(3);

        manager = new Hammer.Manager(el, {
            domEvents: true,
            recognizers: []
        });

        var prevented = false;
        var seenTypes = [];
        var onDomTap = function(ev) {
            seenTypes.push(ev.gesture.type);
            equal(typeof ev.gesture.preventDefault, 'function', 'ev.gesture.preventDefault is defined on DOM event');
            ev.gesture.preventDefault();
        };
        var onDomCustom = function(ev) {
            seenTypes.push(ev.gesture.type);
        };

        el.addEventListener('tap', onDomTap, false);
        el.addEventListener('custom', onDomCustom, false);

        try {
            var payload = {
                target: el,
                srcEvent: {
                    preventDefault: function() {
                        prevented = true;
                    }
                }
            };
            manager.emit('tap', payload);
            manager.emit('custom', payload);

            deepEqual(seenTypes, ['tap', 'custom'], 'ev.gesture.type matches each dispatched DOM event');
            equal(prevented, true, 'ev.gesture.preventDefault invokes srcEvent.preventDefault');
        } finally {
            el.removeEventListener('tap', onDomTap, false);
            el.removeEventListener('custom', onDomCustom, false);
        }
    });

    test('PressRecognizer with time: 0 fires press synchronously on INPUT_START and pressup on immediate INPUT_END', function() {
        var events = [];
        manager = new Hammer.Manager(el, {
            recognizers: [[Hammer.Press, {time: 0}]]
        });
        manager.on('press pressup', function(ev) {
            events.push(ev.type);
        });

        var srcEv = {preventDefault: function() {}, target: el};
        manager.recognize({
            eventType: $H.INPUT_START,
            pointers: [{clientX: 20, clientY: 20}],
            distance: 0,
            deltaTime: 0,
            srcEvent: srcEv
        });
        deepEqual(events, ['press'], 'press fires synchronously on INPUT_START when time is 0');

        // Small move within threshold does not re-emit press
        manager.recognize({
            eventType: $H.INPUT_MOVE,
            pointers: [{clientX: 22, clientY: 20}],
            distance: 2,
            deltaTime: 0,
            srcEvent: srcEv
        });
        deepEqual(events, ['press'], 'INPUT_MOVE within threshold does not re-emit press');

        // Immediate INPUT_END (deltaTime === 0) emits pressup
        manager.recognize({
            eventType: $H.INPUT_END,
            pointers: [{clientX: 22, clientY: 20}],
            distance: 2,
            deltaTime: 0,
            srcEvent: srcEv
        });
        deepEqual(events, ['press', 'pressup'], 'pressup fires on immediate INPUT_END when time is 0');

        // Moving past threshold before INPUT_END suppresses pressup
        events = [];
        manager.recognize({
            eventType: $H.INPUT_START,
            pointers: [{clientX: 20, clientY: 20}],
            distance: 0,
            deltaTime: 0,
            srcEvent: srcEv
        });
        manager.recognize({
            eventType: $H.INPUT_END,
            pointers: [{clientX: 60, clientY: 20}],
            distance: 40,
            deltaTime: 10,
            srcEvent: srcEv
        });
        deepEqual(events, ['press'], 'moving beyond threshold cancels pressup');

        // Default non-zero time still waits asynchronously
        var delayedEvents = [];
        manager.remove('press');
        manager.add(new Hammer.Press({time: 251}));
        manager.on('press', function(ev) {
            delayedEvents.push(ev.type);
        });
        manager.recognize({
            eventType: $H.INPUT_START,
            pointers: [{clientX: 20, clientY: 20}],
            distance: 0,
            deltaTime: 0,
            srcEvent: srcEv
        });
        deepEqual(delayedEvents, [], 'non-zero time press does not fire synchronously');
    });

    asyncTest('PressRecognizer never emits pressup without prior press (timer race and requireFailure)', function() {
        expect(4);

        manager = new Hammer.Manager(el, {recognizers: []});
        var pan = manager.add(new Hammer.Pan({threshold: 5}));
        var press = manager.add(new Hammer.Press({time: 30, threshold: 9}));
        press.requireFailure(pan);

        var events = [];
        manager.on('press pressup', function(ev) {
            events.push(ev.type);
        });

        var srcEv = {cancelable: true, preventDefault: function() {}};

        // 1. Timer-vs-release race: INPUT_END arrives with deltaTime > time before timer callback fires
        press.recognize({eventType: $H.INPUT_START, pointers: [{}], distance: 0, deltaTime: 0, srcEvent: srcEv});
        press.recognize({eventType: $H.INPUT_END, pointers: [{}], distance: 0, deltaTime: 80, srcEvent: srcEv});
        deepEqual(events, [], 'timer race does not emit pressup without press');

        // 2. requireFailure blocks synchronous time: 0 press; blocker later fails before INPUT_END
        var pressZero = manager.add(new Hammer.Press({event: 'press', time: 0, threshold: 9}));
        pressZero.requireFailure(pan);
        pan.state = $H.STATE_BEGAN;
        pressZero.recognize({eventType: $H.INPUT_START, pointers: [{}], distance: 0, deltaTime: 0, srcEvent: srcEv});
        pan.state = $H.STATE_FAILED;
        pressZero.recognize({eventType: $H.INPUT_END, pointers: [{}], distance: 0, deltaTime: 10, srcEvent: srcEv});
        deepEqual(events, [], 'blocked time:0 press does not emit pressup when blocker later fails');

        // 3. requireFailure blocks timed press; blocker fails before release
        var pressTimed = manager.add(new Hammer.Press({event: 'press', time: 20, threshold: 9}));
        pressTimed.requireFailure(pan);
        pan.state = $H.STATE_BEGAN;
        pressTimed.recognize({eventType: $H.INPUT_START, pointers: [{}], distance: 0, deltaTime: 0, srcEvent: srcEv});

        setTimeout(function() {
            pan.state = $H.STATE_FAILED;
            pressTimed.recognize({eventType: $H.INPUT_END, pointers: [{}], distance: 0, deltaTime: 50, srcEvent: srcEv});
            deepEqual(events, [], 'blocked timed press does not emit pressup after blocker fails');

            // 4. Normal unblocked press fires press then pressup
            pressTimed.recognize({eventType: $H.INPUT_START, pointers: [{}], distance: 0, deltaTime: 0, srcEvent: srcEv});
            setTimeout(function() {
                pressTimed.recognize({eventType: $H.INPUT_END, pointers: [{}], distance: 0, deltaTime: 50, srcEvent: srcEv});
                deepEqual(events, ['press', 'pressup'], 'normal press emits press followed by pressup');
                start();
            }, 40);
        }, 40);
    });

    test('computeDeltaXY rebases smoothly after partial INPUT_CANCEL and handles missing offsetDelta', function() {
        var session = {};
        var first = {eventType: $H.INPUT_START, center: {x: 50, y: 10}};
        $H.computeDeltaXY(session, first);
        session.prevInput = first;

        var moved = {eventType: $H.INPUT_MOVE, center: {x: 70, y: 10}};
        $H.computeDeltaXY(session, moved);
        session.prevInput = moved;
        equal(moved.deltaX, 20, 'initial two-finger move tracks +20px');

        // One of two pointers is cancelled (e.g. palm rejection)
        var cancelled = {eventType: $H.INPUT_CANCEL, center: {x: 70, y: 10}};
        $H.computeDeltaXY(session, cancelled);
        session.prevInput = cancelled;

        // Remaining finger reports its own center (25, 10) -> must rebase without jumping to -25
        var afterCancel = {eventType: $H.INPUT_MOVE, center: {x: 25, y: 10}};
        $H.computeDeltaXY(session, afterCancel);
        session.prevInput = afterCancel;
        equal(afterCancel.deltaX, 20, 'deltaX stays continuous immediately after partial INPUT_CANCEL');

        var continued = {eventType: $H.INPUT_MOVE, center: {x: 30, y: 10}};
        $H.computeDeltaXY(session, continued);
        equal(continued.deltaX, 25, 'subsequent move accumulates from rebased offset');

        // Mid-stream move with empty session does not produce NaN
        var midStream = {eventType: $H.INPUT_MOVE, center: {x: 40, y: 15}};
        $H.computeDeltaXY({}, midStream);
        equal(midStream.deltaX, 0, 'missing offsetDelta initializes cleanly instead of NaN');
        equal(midStream.deltaY, 0, 'missing offsetDelta deltaY initializes cleanly');
    });

    test('domEvents: true dispatches composed DOM events that cross Shadow DOM boundaries to outer managers', function() {
        var outer = document.createElement('div');
        var host = document.createElement('div');
        outer.appendChild(host);
        el.appendChild(outer);

        if (!host.attachShadow) {
            ok(true, 'Shadow DOM not supported in environment');
            return;
        }

        var shadow = host.attachShadow({mode: 'open'});
        var shadowLeaf = document.createElement('button');
        shadow.appendChild(shadowLeaf);

        manager = new Hammer.Manager(outer, {
            domEvents: true,
            recognizers: [[Hammer.Tap]]
        });

        var hostEvents = [];
        var outerEvents = [];
        host.addEventListener('tap', function(ev) {
            hostEvents.push({composed: ev.composed, target: ev.gesture && ev.gesture.target});
        });
        outer.addEventListener('tap', function(ev) {
            outerEvents.push({composed: ev.composed, target: ev.gesture && ev.gesture.target});
        });

        function feedShadow(type) {
            var ptr = {clientX: 20, clientY: 20};
            $H.inputHandler(manager, type, {
                pointers: [ptr],
                changedPointers: [ptr],
                pointerType: 'touch',
                srcEvent: {
                    target: host,
                    composedPath: function() {
                        return [shadowLeaf, shadow, host, outer];
                    },
                    preventDefault: function() {}
                }
            });
        }

        feedShadow($H.INPUT_START);
        feedShadow($H.INPUT_END);

        equal(hostEvents.length, 1, 'composed tap DOM event crosses ShadowRoot and reaches shadow host');
        equal(outerEvents.length, 1, 'composed tap DOM event bubbles to outer manager element');
        strictEqual(outerEvents[0] && outerEvents[0].composed, true, 'dispatched DOM event has composed: true');
        strictEqual(outerEvents[0] && outerEvents[0].target, shadowLeaf, 'ev.gesture.target retains inner shadow leaf');
    });
})();
