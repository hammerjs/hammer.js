(function() {
    var el, manager;

    QUnit.module('TouchAction', {
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

    QUnit.test('cleanTouchActions normalizes combined touch-action values', function(assert) {
        var supportsPanXPinch = $H.NATIVE_TOUCH_ACTION && window.CSS && window.CSS.supports &&
            window.CSS.supports('touch-action', 'pan-x pinch-zoom');
        var supportsPanYPinch = $H.NATIVE_TOUCH_ACTION && window.CSS && window.CSS.supports &&
            window.CSS.supports('touch-action', 'pan-y pinch-zoom');
        var expectedPanX = supportsPanXPinch ? 'pan-x pinch-zoom' : 'pan-x';
        var expectedPanY = supportsPanYPinch ? 'pan-y pinch-zoom' : 'pan-y';

        assert.equal($H.cleanTouchActions('none'), 'none', 'none stays none');
        assert.equal($H.cleanTouchActions('pan-x none auto'), 'none', 'none takes precedence');
        assert.equal($H.cleanTouchActions('pan-x pan-y'), 'none', 'pan-x + pan-y collapses to none');
        assert.equal($H.cleanTouchActions('pan-x auto'), expectedPanX, 'pan-x preserves pinch-zoom when supported');
        assert.equal($H.cleanTouchActions('pan-y auto'), expectedPanY, 'pan-y preserves pinch-zoom when supported');
        assert.equal($H.cleanTouchActions('manipulation auto'), 'manipulation', 'manipulation preserved when no pan/none');
        assert.equal($H.cleanTouchActions('pinch-zoom auto'), 'pinch-zoom', 'pinch-zoom preserved when no pan/none/manipulation');
        assert.equal($H.cleanTouchActions('auto'), 'auto', 'auto stays auto');
        assert.equal($H.cleanTouchActions(''), 'auto', 'empty string defaults to auto');
    });

    QUnit.test('TouchAction.compute calculates expected value from enabled recognizers', function(assert) {
        var supportsPanXPinch = $H.NATIVE_TOUCH_ACTION && window.CSS && window.CSS.supports &&
            window.CSS.supports('touch-action', 'pan-x pinch-zoom');
        var supportsPanYPinch = $H.NATIVE_TOUCH_ACTION && window.CSS && window.CSS.supports &&
            window.CSS.supports('touch-action', 'pan-y pinch-zoom');
        var expectedPanX = supportsPanXPinch ? 'pan-x pinch-zoom' : 'pan-x';
        var expectedPanY = supportsPanYPinch ? 'pan-y pinch-zoom' : 'pan-y';

        manager = new Hammer.Manager(el, {recognizers: []});
        assert.equal(manager.touchAction.actions, 'auto', 'no recognizers computes auto');

        manager.add(new Hammer.Pan({direction: Hammer.DIRECTION_HORIZONTAL}));
        assert.equal(manager.touchAction.actions, expectedPanY, 'horizontal pan computes pan-y (+ pinch-zoom when supported)');

        manager.add(new Hammer.Pan({direction: Hammer.DIRECTION_VERTICAL}));
        assert.equal(manager.touchAction.actions, expectedPanX, 'vertical pan replaces horizontal and computes pan-x (+ pinch-zoom when supported)');

        manager.add(new Hammer.Swipe({direction: Hammer.DIRECTION_HORIZONTAL}));
        assert.equal(manager.touchAction.actions, 'none', 'vertical pan + horizontal swipe computes none');

        manager.remove('pan');
        assert.equal(manager.touchAction.actions, expectedPanY, 'removing pan leaves horizontal swipe -> pan-y (+ pinch-zoom when supported)');

        manager.remove('swipe');
        manager.add(new Hammer.Press());
        assert.equal(manager.touchAction.actions, 'auto', 'press recognizer computes auto');

        manager.add(new Hammer.Rotate({enable: false}));
        assert.equal(manager.touchAction.actions, 'auto', 'disabled rotate recognizer is ignored in compute');

        manager.get('rotate').set({enable: true});
        manager.touchAction.update();
        assert.equal(manager.touchAction.actions, 'none', 'enabled rotate recognizer computes none');

        manager.remove('rotate');
        manager.add(new Hammer.Pinch({enable: true}));
        assert.equal(manager.touchAction.actions, 'none', 'enabled pinch recognizer computes none');
    });

    QUnit.test('Manager.destroy restores original inline touch-action style', function(assert) {
        if ($H.NATIVE_TOUCH_ACTION) {
            // 1. No initial inline touch-action -> restored to empty string after multiple updates
            el.style[$H.PREFIXED_TOUCH_ACTION] = '';
            manager = new Hammer(el);
            assert.ok(el.style[$H.PREFIXED_TOUCH_ACTION] !== '', 'Hammer sets inline touch-action');
            manager.set({touchAction: 'none'});
            manager.destroy();
            assert.equal(el.style[$H.PREFIXED_TOUCH_ACTION], '', 'destroy() clears inline touch-action when originally unset');
            manager.destroy();
            assert.equal(el.style[$H.PREFIXED_TOUCH_ACTION], '', 'calling destroy() twice remains safe');

            // 2. Existing inline touch-action -> restored to original value
            el.style[$H.PREFIXED_TOUCH_ACTION] = 'manipulation';
            manager = new Hammer.Manager(el, {
                recognizers: [[Hammer.Pan, {direction: Hammer.DIRECTION_ALL}]]
            });
            assert.equal(el.style[$H.PREFIXED_TOUCH_ACTION], 'none', 'Hammer overrides inline touch-action while active');
            manager.destroy();
            assert.equal(el.style[$H.PREFIXED_TOUCH_ACTION], 'manipulation', 'destroy() restores previous inline touch-action');
            manager = null;
        } else {
            assert.ok(true, 'native touch-action not supported in environment');
        }
    });

    QUnit.test('TouchAction.preventDefaults enforces polyfill rules when native touch-action is unavailable', function(assert) {
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
            assert.equal(ev.prevented, false, 'touchAction none allows short tap without preventDefault');

            // 2. touchAction: none prevents once distance >= 2
            ev = makeSrcEvent();
            manager.touchAction.preventDefaults({
                srcEvent: ev,
                offsetDirection: Hammer.DIRECTION_RIGHT,
                pointers: [{}],
                distance: 10,
                deltaTime: 50
            });
            assert.equal(ev.prevented, true, 'touchAction none prevents default when moving');
            assert.equal(manager.session.prevented, true, 'session.prevented flag set');

            // 3. Subsequent events in same session always preventDefault
            ev = makeSrcEvent();
            manager.touchAction.preventDefaults({
                srcEvent: ev,
                offsetDirection: Hammer.DIRECTION_NONE,
                pointers: [{}],
                distance: 0,
                deltaTime: 10
            });
            assert.equal(ev.prevented, true, 'subsequent events in prevented session call preventDefault');

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
            assert.equal(ev.prevented, false, 'pan-x pan-y does not prevent default');

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
            assert.equal(ev.prevented, false, 'pan-y allows vertical scrolling');

            ev = makeSrcEvent();
            manager.touchAction.preventDefaults({
                srcEvent: ev,
                offsetDirection: Hammer.DIRECTION_LEFT,
                pointers: [{}],
                distance: 30,
                deltaTime: 50
            });
            assert.equal(ev.prevented, true, 'pan-y prevents horizontal movement');

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
            assert.equal(ev.prevented, false, 'pan-x allows horizontal scrolling');

            ev = makeSrcEvent();
            manager.touchAction.preventDefaults({
                srcEvent: ev,
                offsetDirection: Hammer.DIRECTION_UP,
                pointers: [{}],
                distance: 30,
                deltaTime: 50
            });
            assert.equal(ev.prevented, true, 'pan-x prevents vertical movement');
        } finally {
            if (map && origMap) {
                map.none = origMap.none;
                map['pan-x'] = origMap['pan-x'];
                map['pan-y'] = origMap['pan-y'];
            }
        }
    });

    QUnit.test('TouchAction.set normalizes whitespace and case before compute and native style lookup', function(assert) {
        var supportsPanYPinch = $H.NATIVE_TOUCH_ACTION && window.CSS && window.CSS.supports &&
            window.CSS.supports('touch-action', 'pan-y pinch-zoom');
        var expectedPanY = supportsPanYPinch ? 'pan-y pinch-zoom' : 'pan-y';

        manager = new Hammer.Manager(el, {
            recognizers: [[Hammer.Pan, {direction: Hammer.DIRECTION_HORIZONTAL}]],
            touchAction: ' COMPUTE '
        });
        assert.equal(manager.touchAction.actions, expectedPanY, 'padded uppercase COMPUTE triggers touchAction.compute()');

        manager.set({touchAction: ' PAN-X '});
        assert.equal(manager.touchAction.actions, 'pan-x', 'explicit pan-x stored normalized without adding pinch-zoom');
        if ($H.NATIVE_TOUCH_ACTION) {
            assert.equal(el.style[$H.PREFIXED_TOUCH_ACTION], 'pan-x', 'native CSS touch-action applied for uppercase/padded value');
        }
    });

    QUnit.test('TouchAction supports pinch-zoom and dynamic CSS.supports touch-action values with graceful fallback', function(assert) {
        manager = new Hammer.Manager(el, {recognizers: [], touchAction: 'pinch-zoom'});
        assert.equal(manager.touchAction.actions, 'pinch-zoom', 'pinch-zoom action stored');
        if ($H.NATIVE_TOUCH_ACTION && window.CSS && window.CSS.supports('touch-action', 'pinch-zoom')) {
            assert.equal(el.style[$H.PREFIXED_TOUCH_ACTION], 'pinch-zoom', 'native CSS touch-action applied for pinch-zoom');
        }

        manager.set({touchAction: 'pan-y pinch-zoom'});
        if ($H.NATIVE_TOUCH_ACTION && window.CSS && window.CSS.supports('touch-action', 'pan-y pinch-zoom')) {
            assert.equal(el.style[$H.PREFIXED_TOUCH_ACTION], 'pan-y pinch-zoom', 'native CSS touch-action applied for pan-y pinch-zoom');
        }

        // Invalid touch-action value is ignored natively
        var prevStyle = el.style[$H.PREFIXED_TOUCH_ACTION];
        manager.set({touchAction: 'not-a-valid-touch-action'});
        if ($H.NATIVE_TOUCH_ACTION) {
            assert.equal(el.style[$H.PREFIXED_TOUCH_ACTION], prevStyle, 'unsupported touch-action value does not overwrite style');
        }

        // Fallback to plain pan-y when browser lacks pan-y pinch-zoom support
        var map = $H.TOUCH_ACTION_MAP;
        var origVal = map ? map['pan-y pinch-zoom'] : undefined;
        try {
            if (map) {
                map['pan-y pinch-zoom'] = false;
            }
            assert.equal($H.cleanTouchActions('pan-y'), 'pan-y', 'cleanTouchActions falls back to pan-y when pan-y pinch-zoom is unsupported');
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

    QUnit.test('TouchAction handles unsupported compound values, pinch-zoom precedence over manipulation, and prototype keys', function(assert) {
        // 1. pinch-zoom is more restrictive than manipulation and takes precedence
        assert.equal($H.cleanTouchActions('manipulation pinch-zoom'), 'pinch-zoom', 'pinch-zoom takes precedence over manipulation');
        assert.equal($H.cleanTouchActions('pinch-zoom manipulation'), 'pinch-zoom', 'pinch-zoom takes precedence regardless of order');

        // 2. Prototype property names on TOUCH_ACTION_MAP return false
        assert.strictEqual($H.supportsTouchAction('constructor'), false, 'supportsTouchAction("constructor") returns false');
        assert.strictEqual($H.supportsTouchAction('toString'), false, 'supportsTouchAction("toString") returns false');

        // 3. Unsupported compound value (e.g. "pan-y pinch-zoom") runs JS polyfill even when plain "pan-y" is supported
        var map = $H.TOUCH_ACTION_MAP;
        var origCompound = map ? map['pan-y pinch-zoom'] : undefined;
        var origPanY = map ? map['pan-y'] : undefined;
        try {
            if (map) {
                map['pan-y'] = true;
                map['pan-y pinch-zoom'] = false;
            }
            manager = new Hammer.Manager(el, {recognizers: [], touchAction: 'pan-y pinch-zoom'});

            var horizEv = {cancelable: true, prevented: false, preventDefault: function() { this.prevented = true; }};
            manager.touchAction.preventDefaults({
                srcEvent: horizEv,
                offsetDirection: Hammer.DIRECTION_RIGHT,
                pointers: [{}],
                distance: 30,
                deltaTime: 50
            });
            assert.equal(horizEv.prevented, true, 'polyfill prevents horizontal scroll for unsupported compound "pan-y pinch-zoom"');

            manager.session = {};
            var vertEv = {cancelable: true, prevented: false, preventDefault: function() { this.prevented = true; }};
            manager.touchAction.preventDefaults({
                srcEvent: vertEv,
                offsetDirection: Hammer.DIRECTION_DOWN,
                pointers: [{}],
                distance: 30,
                deltaTime: 50
            });
            assert.equal(vertEv.prevented, false, 'polyfill still allows vertical scroll for "pan-y pinch-zoom"');
        } finally {
            if (map) {
                map['pan-y'] = origPanY;
                if (origCompound === undefined) {
                    delete map['pan-y pinch-zoom'];
                } else {
                    map['pan-y pinch-zoom'] = origCompound;
                }
            }
        }
    });

    QUnit.test('TouchAction.preventDefaults exits early when native touch-action supports current value', function(assert) {
        manager = new Hammer.Manager(el, {recognizers: [], touchAction: 'none'});
        if ($H.TOUCH_ACTION_MAP && $H.TOUCH_ACTION_MAP.none) {
            var directionReads = 0;
            var input = {
                srcEvent: {cancelable: true, preventDefault: function() {}},
                pointers: [{}],
                distance: 30,
                deltaTime: 50
            };
            Object.defineProperty(input, 'offsetDirection', {
                get: function() {
                    directionReads++;
                    return Hammer.DIRECTION_RIGHT;
                }
            });
            manager.touchAction.preventDefaults(input);
            assert.equal(directionReads, 0, 'skips polyfill checks when native touch-action supports value');
        } else {
            assert.ok(true, 'native touch-action not supported in environment');
        }
    });

    QUnit.test('TouchAction falls back to JS preventDefault when element has no style (document/window)', function(assert) {
        // 1. document with touchAction: 'none'
        var docMgr = new Hammer.Manager(document, {recognizers: [], touchAction: 'none'});
        var docEv = {cancelable: true, prevented: false, preventDefault: function() { this.prevented = true; }};
        try {
            assert.strictEqual(docMgr.touchAction.appliedNative, false, 'appliedNative is false for document target');
            docMgr.touchAction.preventDefaults({
                srcEvent: docEv,
                offsetDirection: Hammer.DIRECTION_RIGHT,
                pointers: [{}],
                distance: 30,
                deltaTime: 50
            });
            assert.equal(docEv.prevented, true, 'document target with touchAction "none" uses JS preventDefault polyfill');
        } finally {
            docMgr.destroy();
        }

        // 2. window with touchAction: 'pan-y'
        var winMgr = new Hammer.Manager(window, {recognizers: [], touchAction: 'pan-y'});
        var horizEv = {cancelable: true, prevented: false, preventDefault: function() { this.prevented = true; }};
        var vertEv = {cancelable: true, prevented: false, preventDefault: function() { this.prevented = true; }};
        try {
            assert.strictEqual(winMgr.touchAction.appliedNative, false, 'appliedNative is false for window target');
            winMgr.touchAction.preventDefaults({
                srcEvent: horizEv,
                offsetDirection: Hammer.DIRECTION_RIGHT,
                pointers: [{}],
                distance: 30,
                deltaTime: 50
            });
            assert.equal(horizEv.prevented, true, 'window target with touchAction "pan-y" prevents horizontal drag');

            winMgr.session = {};
            winMgr.touchAction.preventDefaults({
                srcEvent: vertEv,
                offsetDirection: Hammer.DIRECTION_DOWN,
                pointers: [{}],
                distance: 30,
                deltaTime: 50
            });
            assert.equal(vertEv.prevented, false, 'window target with touchAction "pan-y" allows vertical drag');
        } finally {
            winMgr.destroy();
        }
    });

    QUnit.test('TouchAction allowlists cache keys, rejects CSS keywords/substrings, supports pinch-zoom polyfill, and guards clobbered CSS.supports', function(assert) {
        var map = $H.TOUCH_ACTION_MAP;

        // 1. Allowlist blocks var(--x), inherit, arbitrary strings from polluting TOUCH_ACTION_MAP
        assert.strictEqual($H.supportsTouchAction('var(--x)'), false, 'var(--x) rejected by touch-action allowlist');
        assert.strictEqual($H.supportsTouchAction('inherit'), false, 'inherit rejected by touch-action allowlist');
        assert.strictEqual($H.supportsTouchAction('arbitrary-untrusted-value'), false, 'arbitrary string rejected');
        if (map) {
            assert.strictEqual('arbitrary-untrusted-value' in map, false, 'arbitrary string is never cached in TOUCH_ACTION_MAP');
            assert.strictEqual('var(--x)' in map, false, 'var(--x) is never cached in TOUCH_ACTION_MAP');
        }

        // 2. Token matching prevents substring false positives ('nonexistent' != 'none')
        assert.equal($H.cleanTouchActions('nonexistent'), 'auto', 'cleanTouchActions does not treat "nonexistent" as "none"');

        // 3. Non-string values in set() do not throw and extra internal whitespace is normalized
        manager = new Hammer.Manager(el, {recognizers: [], touchAction: 'pan-y   pinch-zoom'});
        assert.equal(manager.touchAction.actions, 'pan-y pinch-zoom', 'multiple internal spaces collapsed to single space');
        manager.touchAction.set(null);
        manager.touchAction.set(undefined);
        assert.equal(manager.touchAction.actions, 'pan-y pinch-zoom', 'non-string set() values safely ignored');

        // 4. pinch-zoom JS polyfill blocks single-pointer panning but allows 2-pointer pinch and short taps
        var origPinch = map ? map['pinch-zoom'] : undefined;
        var origCssSupports = window.CSS && window.CSS.supports;
        try {
            if (map) {
                map['pinch-zoom'] = false;
            }
            manager.touchAction.set('none');
            manager.touchAction.set('pinch-zoom');
            assert.strictEqual(manager.touchAction.appliedNative, false, 'appliedNative false for unsupported pinch-zoom');
            if ($H.NATIVE_TOUCH_ACTION) {
                assert.equal(el.style[$H.PREFIXED_TOUCH_ACTION], '', 'stale native "none" cleared when falling back to JS polyfill');
            }

            var tapEv = {cancelable: true, prevented: false, preventDefault: function() { this.prevented = true; }};
            manager.touchAction.preventDefaults({
                srcEvent: tapEv,
                offsetDirection: Hammer.DIRECTION_NONE,
                pointers: [{}],
                distance: 1,
                deltaTime: 50
            });
            assert.equal(tapEv.prevented, false, 'pinch-zoom polyfill allows short 1-pointer tap');

            var panEv = {cancelable: true, prevented: false, preventDefault: function() { this.prevented = true; }};
            manager.touchAction.preventDefaults({
                srcEvent: panEv,
                offsetDirection: Hammer.DIRECTION_DOWN,
                pointers: [{}],
                distance: 25,
                deltaTime: 50
            });
            assert.equal(panEv.prevented, true, 'pinch-zoom polyfill prevents single-pointer panning');

            manager.session = {};
            var pinchEv = {cancelable: true, prevented: false, preventDefault: function() { this.prevented = true; }};
            manager.touchAction.preventDefaults({
                srcEvent: pinchEv,
                offsetDirection: Hammer.DIRECTION_DOWN,
                pointers: [{}, {}],
                distance: 25,
                deltaTime: 50
            });
            assert.equal(pinchEv.prevented, false, 'pinch-zoom polyfill allows 2-pointer pinch');

            // 5. Clobbered non-function window.CSS.supports does not throw
            if (map && window.CSS) {
                delete map['pan-left'];
                window.CSS.supports = 'clobbered';
                assert.strictEqual($H.supportsTouchAction('pan-left'), false, 'non-function window.CSS.supports handled safely');
                delete map['pan-left'];
            }
        } finally {
            if (window.CSS) {
                window.CSS.supports = origCssSupports;
            }
            if (map) {
                if (origPinch === undefined) {
                    delete map['pinch-zoom'];
                } else {
                    map['pinch-zoom'] = origPinch;
                }
            }
        }
    });
})();
