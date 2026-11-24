(function() {
    var el, manager;

    module('Core Coverage (Manager, Recognizers, Utils)', {
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
        manager.destroy();
        equal(manager.element, null, 'destroy() clears element reference');
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
            swipe.recognize({
                eventType: $H.INPUT_END,
                pointers: [{}],
                maxPointers: 1,
                distance: 40,
                overallVelocity: 1.0,
                overallVelocityX: 1.0,
                overallVelocityY: 1.0,
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

        // PressRecognizer emit guard when not recognized + pressup on valid release
        var press = manager.add(new Hammer.Press({time: 200, threshold: 9}));
        var pressEvents = [];
        manager.on('press pressup', function(ev) {
            pressEvents.push(ev.type);
        });
        press.state = $H.STATE_FAILED;
        press.emit({eventType: $H.INPUT_END, srcEvent: srcEv});
        equal(pressEvents.length, 0, 'Press.emit does nothing when state !== STATE_RECOGNIZED');

        press.recognize({
            eventType: $H.INPUT_END,
            pointers: [{}],
            distance: 2,
            deltaTime: 300,
            srcEvent: srcEv
        });
        deepEqual(pressEvents, ['pressup'], 'Press emits pressup when released after time threshold');
    });

    test('Utils extend, merge, deprecate, prefixed, hasParent, inArray, uniqueId, getWindowForElement', function() {
        var origWarn = window.console && window.console.warn;
        var warnings = [];
        if (window.console) {
            window.console.warn = function() {
                warnings.push(Array.prototype.slice.call(arguments).join(' '));
            };
        }

        try {
            // deprecate
            var wrapped = $H.deprecate(function(x) {
                return this.base + x;
            }, 'oldFn', 'Use newFn.');
            equal(wrapped.call({base: 10}, 5), 15, 'deprecate preserves context, args, and return value');
            ok(warnings.length >= 1 && warnings[0].indexOf('DEPRECATED METHOD: oldFn') !== -1, 'deprecate logs warning');

            // extend (overwrite and merge modes)
            var dest = {a: 1, b: 2};
            $H.extend(dest, {b: 20, c: 3});
            deepEqual(dest, {a: 1, b: 20, c: 3}, 'extend overwrites existing keys');

            // merge (preserves existing keys)
            var mDest = {a: 1, b: 2};
            $H.merge(mDest, {b: 99, c: 3});
            deepEqual(mDest, {a: 1, b: 2, c: 3}, 'merge preserves existing keys and adds missing ones');
        } finally {
            if (window.console) {
                window.console.warn = origWarn;
            }
        }

        // prefixed
        equal($H.prefixed({webkitFoo: 1}, 'foo'), 'webkitFoo', 'prefixed finds vendor-prefixed property');
        equal($H.prefixed({bar: 1}, 'bar'), 'bar', 'prefixed finds unprefixed property');
        equal($H.prefixed({}, 'nonExistentProp'), undefined, 'prefixed returns undefined when absent');

        // hasParent
        var child = document.createElement('span');
        el.appendChild(child);
        equal($H.hasParent(child, el), true, 'hasParent returns true for descendant');
        equal($H.hasParent(el, el), true, 'hasParent returns true for self');
        equal($H.hasParent(document.createElement('div'), el), false, 'hasParent returns false for unrelated node');
        equal($H.hasParent(null, el), false, 'hasParent returns false for null');

        // inArray without native indexOf fallback & with findByKey
        var objArr = [{id: 1}, {id: 2}];
        equal($H.inArray(objArr, 2, 'id'), 1, 'inArray finds by key');
        equal($H.inArray(objArr, 99, 'id'), -1, 'inArray returns -1 when key not found');
        var arrayLike = {0: 'a', 1: 'b', length: 2};
        equal($H.inArray(arrayLike, 'b'), 1, 'inArray loop fallback works when indexOf absent');
        equal($H.inArray(arrayLike, 'z'), -1, 'inArray loop fallback returns -1 when not found');

        // boolOrFn, ifUndefined, each(null), uniqueArray(sort without key), uniqueId, getWindowForElement
        equal($H.boolOrFn(true), true, 'boolOrFn returns boolean directly');
        equal($H.boolOrFn(function(selfObj, arg2) {
            return this === selfObj && this.flag && arg2 === true;
        }, [{flag: true}, true]), true, 'boolOrFn calls function with context and args');
        equal($H.ifUndefined(undefined, 'fallback'), 'fallback', 'ifUndefined returns fallback for undefined');
        equal($H.ifUndefined(false, 'fallback'), false, 'ifUndefined preserves falsy non-undefined values');
        equal($H.each(null, function() { ok(false, 'should not iterate'); }), undefined, 'each handles null safely');
        deepEqual($H.uniqueArray(['c', 'a', 'b', 'a'], null, true), ['a', 'b', 'c'], 'uniqueArray sorts primitives without key');
        ok($H.uniqueId() < $H.uniqueId(), 'uniqueId increments monotonically');
        equal($H.getWindowForElement(el), window, 'getWindowForElement returns window');
    });
})();
