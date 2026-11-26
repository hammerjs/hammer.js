(function() {
    var el, manager;

    module('TouchAction', {
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

    test('cleanTouchActions normalizes combined touch-action values', function() {
        var supportsPanXPinch = $H.NATIVE_TOUCH_ACTION && window.CSS && window.CSS.supports &&
            window.CSS.supports('touch-action', 'pan-x pinch-zoom');
        var supportsPanYPinch = $H.NATIVE_TOUCH_ACTION && window.CSS && window.CSS.supports &&
            window.CSS.supports('touch-action', 'pan-y pinch-zoom');
        var expectedPanX = supportsPanXPinch ? 'pan-x pinch-zoom' : 'pan-x';
        var expectedPanY = supportsPanYPinch ? 'pan-y pinch-zoom' : 'pan-y';

        equal($H.cleanTouchActions('none'), 'none', 'none stays none');
        equal($H.cleanTouchActions('pan-x none auto'), 'none', 'none takes precedence');
        equal($H.cleanTouchActions('pan-x pan-y'), 'none', 'pan-x + pan-y collapses to none');
        equal($H.cleanTouchActions('pan-x auto'), expectedPanX, 'pan-x preserves pinch-zoom when supported');
        equal($H.cleanTouchActions('pan-y auto'), expectedPanY, 'pan-y preserves pinch-zoom when supported');
        equal($H.cleanTouchActions('manipulation auto'), 'manipulation', 'manipulation preserved when no pan/none');
        equal($H.cleanTouchActions('pinch-zoom auto'), 'pinch-zoom', 'pinch-zoom preserved when no pan/none/manipulation');
        equal($H.cleanTouchActions('auto'), 'auto', 'auto stays auto');
        equal($H.cleanTouchActions(''), 'auto', 'empty string defaults to auto');
    });

    test('TouchAction.compute calculates expected value from enabled recognizers', function() {
        var supportsPanXPinch = $H.NATIVE_TOUCH_ACTION && window.CSS && window.CSS.supports &&
            window.CSS.supports('touch-action', 'pan-x pinch-zoom');
        var supportsPanYPinch = $H.NATIVE_TOUCH_ACTION && window.CSS && window.CSS.supports &&
            window.CSS.supports('touch-action', 'pan-y pinch-zoom');
        var expectedPanX = supportsPanXPinch ? 'pan-x pinch-zoom' : 'pan-x';
        var expectedPanY = supportsPanYPinch ? 'pan-y pinch-zoom' : 'pan-y';

        manager = new Hammer.Manager(el, {recognizers: []});
        equal(manager.touchAction.actions, 'auto', 'no recognizers computes auto');

        manager.add(new Hammer.Pan({direction: Hammer.DIRECTION_HORIZONTAL}));
        equal(manager.touchAction.actions, expectedPanY, 'horizontal pan computes pan-y (+ pinch-zoom when supported)');

        manager.add(new Hammer.Pan({direction: Hammer.DIRECTION_VERTICAL}));
        equal(manager.touchAction.actions, expectedPanX, 'vertical pan replaces horizontal and computes pan-x (+ pinch-zoom when supported)');

        manager.add(new Hammer.Swipe({direction: Hammer.DIRECTION_HORIZONTAL}));
        equal(manager.touchAction.actions, 'none', 'vertical pan + horizontal swipe computes none');

        manager.remove('pan');
        equal(manager.touchAction.actions, expectedPanY, 'removing pan leaves horizontal swipe -> pan-y (+ pinch-zoom when supported)');

        manager.remove('swipe');
        manager.add(new Hammer.Press());
        equal(manager.touchAction.actions, 'auto', 'press recognizer computes auto');

        manager.add(new Hammer.Rotate({enable: false}));
        equal(manager.touchAction.actions, 'auto', 'disabled rotate recognizer is ignored in compute');

        manager.get('rotate').set({enable: true});
        manager.touchAction.update();
        equal(manager.touchAction.actions, 'none', 'enabled rotate recognizer computes none');

        manager.remove('rotate');
        manager.add(new Hammer.Pinch({enable: true}));
        equal(manager.touchAction.actions, 'none', 'enabled pinch recognizer computes none');
    });

    test('TouchAction.preventDefaults enforces polyfill rules when native touch-action is unavailable', function() {
        manager = new Hammer.Manager(el, {recognizers: [], touchAction: 'none'});

        var map = $H.TOUCH_ACTION_MAP;
        var origMap = map ? {
            none: map.none,
            'pan-x': map['pan-x'],
            'pan-y': map['pan-y']
        } : null;

        function makeSrcEvent() {
            return {
                cancelable: true,
                prevented: false,
                preventDefault: function() {
                    this.prevented = true;
                }
            };
        }

        try {
            if (map) {
                map.none = false;
                map['pan-x'] = false;
                map['pan-y'] = false;
            }

            // 1. touchAction: none skips tap-like input (1 pointer, distance < 2, deltaTime < 250)
            var ev = makeSrcEvent();
            manager.touchAction.preventDefaults({
                srcEvent: ev,
                offsetDirection: Hammer.DIRECTION_NONE,
                pointers: [{}],
                distance: 1,
                deltaTime: 50
            });
            equal(ev.prevented, false, 'touchAction none allows short tap without preventDefault');

            // 2. touchAction: none prevents once distance >= 2
            ev = makeSrcEvent();
            manager.touchAction.preventDefaults({
                srcEvent: ev,
                offsetDirection: Hammer.DIRECTION_RIGHT,
                pointers: [{}],
                distance: 10,
                deltaTime: 50
            });
            equal(ev.prevented, true, 'touchAction none prevents default when moving');
            equal(manager.session.prevented, true, 'session.prevented flag set');

            // 3. Subsequent events in same session always preventDefault
            ev = makeSrcEvent();
            manager.touchAction.preventDefaults({
                srcEvent: ev,
                offsetDirection: Hammer.DIRECTION_NONE,
                pointers: [{}],
                distance: 0,
                deltaTime: 10
            });
            equal(ev.prevented, true, 'subsequent events in prevented session call preventDefault');

            // 4. pan-x pan-y allows all scrolling (never prevents)
            manager.session = {};
            manager.touchAction.set('pan-x pan-y');
            ev = makeSrcEvent();
            manager.touchAction.preventDefaults({
                srcEvent: ev,
                offsetDirection: Hammer.DIRECTION_RIGHT,
                pointers: [{}],
                distance: 30,
                deltaTime: 50
            });
            equal(ev.prevented, false, 'pan-x pan-y does not prevent default');

            // 5. pan-y prevents horizontal gestures, allows vertical
            manager.session = {};
            manager.touchAction.set('pan-y');
            ev = makeSrcEvent();
            manager.touchAction.preventDefaults({
                srcEvent: ev,
                offsetDirection: Hammer.DIRECTION_DOWN,
                pointers: [{}],
                distance: 30,
                deltaTime: 50
            });
            equal(ev.prevented, false, 'pan-y allows vertical scrolling');

            ev = makeSrcEvent();
            manager.touchAction.preventDefaults({
                srcEvent: ev,
                offsetDirection: Hammer.DIRECTION_LEFT,
                pointers: [{}],
                distance: 30,
                deltaTime: 50
            });
            equal(ev.prevented, true, 'pan-y prevents horizontal movement');

            // 6. pan-x prevents vertical gestures, allows horizontal
            manager.session = {};
            manager.touchAction.set('pan-x');
            ev = makeSrcEvent();
            manager.touchAction.preventDefaults({
                srcEvent: ev,
                offsetDirection: Hammer.DIRECTION_RIGHT,
                pointers: [{}],
                distance: 30,
                deltaTime: 50
            });
            equal(ev.prevented, false, 'pan-x allows horizontal scrolling');

            ev = makeSrcEvent();
            manager.touchAction.preventDefaults({
                srcEvent: ev,
                offsetDirection: Hammer.DIRECTION_UP,
                pointers: [{}],
                distance: 30,
                deltaTime: 50
            });
            equal(ev.prevented, true, 'pan-x prevents vertical movement');
        } finally {
            if (map && origMap) {
                map.none = origMap.none;
                map['pan-x'] = origMap['pan-x'];
                map['pan-y'] = origMap['pan-y'];
            }
        }
    });

    test('TouchAction.set normalizes whitespace and case before compute and native style lookup', function() {
        var supportsPanYPinch = $H.NATIVE_TOUCH_ACTION && window.CSS && window.CSS.supports &&
            window.CSS.supports('touch-action', 'pan-y pinch-zoom');
        var expectedPanY = supportsPanYPinch ? 'pan-y pinch-zoom' : 'pan-y';

        manager = new Hammer.Manager(el, {
            recognizers: [[Hammer.Pan, {direction: Hammer.DIRECTION_HORIZONTAL}]],
            touchAction: ' COMPUTE '
        });
        equal(manager.touchAction.actions, expectedPanY, 'padded uppercase COMPUTE triggers touchAction.compute()');

        manager.set({touchAction: ' PAN-X '});
        equal(manager.touchAction.actions, 'pan-x', 'explicit pan-x stored normalized without adding pinch-zoom');
        if ($H.NATIVE_TOUCH_ACTION) {
            equal(el.style[$H.PREFIXED_TOUCH_ACTION], 'pan-x', 'native CSS touch-action applied for uppercase/padded value');
        }
    });

    test('TouchAction supports pinch-zoom and dynamic CSS.supports touch-action values with graceful fallback', function() {
        manager = new Hammer.Manager(el, {recognizers: [], touchAction: 'pinch-zoom'});
        equal(manager.touchAction.actions, 'pinch-zoom', 'pinch-zoom action stored');
        if ($H.NATIVE_TOUCH_ACTION && window.CSS && window.CSS.supports('touch-action', 'pinch-zoom')) {
            equal(el.style[$H.PREFIXED_TOUCH_ACTION], 'pinch-zoom', 'native CSS touch-action applied for pinch-zoom');
        }

        manager.set({touchAction: 'pan-y pinch-zoom'});
        if ($H.NATIVE_TOUCH_ACTION && window.CSS && window.CSS.supports('touch-action', 'pan-y pinch-zoom')) {
            equal(el.style[$H.PREFIXED_TOUCH_ACTION], 'pan-y pinch-zoom', 'native CSS touch-action applied for pan-y pinch-zoom');
        }

        // Invalid touch-action value is ignored natively
        var prevStyle = el.style[$H.PREFIXED_TOUCH_ACTION];
        manager.set({touchAction: 'not-a-valid-touch-action'});
        if ($H.NATIVE_TOUCH_ACTION) {
            equal(el.style[$H.PREFIXED_TOUCH_ACTION], prevStyle, 'unsupported touch-action value does not overwrite style');
        }

        // Fallback to plain pan-y when browser lacks pan-y pinch-zoom support
        var map = $H.TOUCH_ACTION_MAP;
        var origVal = map ? map['pan-y pinch-zoom'] : undefined;
        try {
            if (map) {
                map['pan-y pinch-zoom'] = false;
            }
            equal($H.cleanTouchActions('pan-y'), 'pan-y', 'cleanTouchActions falls back to pan-y when pan-y pinch-zoom is unsupported');
        } finally {
            if (map) {
                if (origVal === undefined) {
                    delete map['pan-y pinch-zoom'];
                } else {
                    map['pan-y pinch-zoom'] = origVal;
                }
            }
        }
    });
})();
