QUnit.module('utils');

// for the tests, all hammer properties and methods of Hammer are exposed to window.$H

QUnit.test('get/set prefixed util', function(assert) {
    assert.ok($H.prefixed(window, 'FakeProperty') === undefined, 'non existent property returns undefined');

    window.webkitFakeProperty = 1337;
    assert.ok($H.prefixed(window, 'FakeProperty') == 'webkitFakeProperty', 'existent prefixed property returns the prefixed name');

    delete window.webkitFakeProperty;
});

QUnit.test('fnBind', function(assert) {
    var context = { a: true };

    $H.bindFn(function(b) {
        assert.ok(this.a === true, 'bindFn scope');
        assert.ok(b === 123, 'bindFn argument');
    }, context)(123);
});

QUnit.test('Inherit objects', function(assert) {
    function Base() {
        this.name = true;
    }

    function Child() {
        Base.call(this);
    }

    $H.inherit(Child, Base, {
        newMethod: function() {
        }
    });

    var inst = new Child();

    assert.ok(inst.name == true, 'child has extended from base');
    assert.ok(inst.newMethod, 'child has a new method');
    assert.ok(Child.prototype.newMethod, 'child has a new prototype method');
    assert.ok(inst instanceof Child, 'is instanceof Child');
    assert.ok(inst instanceof Base, 'is instanceof Base');
    assert.ok(inst._super === Base.prototype, '_super is ref to prototype of Base');
});

QUnit.test('toArray', function(assert) {
    assert.ok(Array.isArray($H.toArray({ 0: true, 1: 'second', length: 2 })), 'converted an array-like object to an array');
    assert.ok(Array.isArray($H.toArray([true, true])), 'array stays an array');
});

QUnit.test('inArray', function(assert) {
    assert.ok($H.inArray([1, 2, 3, 4, 'hammer'], 'hammer') === 4, 'found item and returned the index');
    assert.ok($H.inArray([1, 2, 3, 4, 'hammer'], 'notfound') === -1, 'not found an item and returned -1');
    assert.ok($H.inArray([
        {id: 2},
        {id: 24}
    ], '24', 'id') === 1, 'find by key and return the index');
    assert.ok($H.inArray([
        {id: 2},
        {id: 24}
    ], '22', 'id') === -1, 'not found by key and return -1');
});

QUnit.test('splitStr', function(assert) {
    assert.deepEqual($H.splitStr(' a  b  c d   '), ['a', 'b', 'c', 'd'], 'str split valid');
    assert.deepEqual($H.splitStr(''), [], 'empty string returns empty array');
    assert.deepEqual($H.splitStr('   '), [], 'whitespace string returns empty array');
});

QUnit.test('uniqueArray', function(assert) {
    assert.deepEqual($H.uniqueArray([
        {id: 1},
        {id: 2},
        {id: 2}
    ], 'id'), [
        {id: 1},
        {id: 2}
    ], 'remove duplicate ids');

    assert.deepEqual($H.uniqueArray([
        {id: 3},
        {id: 1},
        {id: 2},
        {id: 1}
    ], 'id', true), [
        {id: 1},
        {id: 2},
        {id: 3}
    ], 'remove duplicate ids and sort ascending by key');

    assert.deepEqual($H.uniqueArray([
        {id: 2},
        {id: 1}
    ], 'id', true), [
        {id: 1},
        {id: 2}
    ], 'sort two reversed items ascending by key');
});

QUnit.test('boolOrFn', function(assert) {
    assert.equal($H.boolOrFn(true), true, 'Passing an boolean');
    assert.equal($H.boolOrFn(false), false, 'Passing an boolean');
    assert.equal($H.boolOrFn(function() {
        return true;
    }), true, 'Passing an boolean');
    assert.equal($H.boolOrFn(1), true, 'Passing an integer');
});

QUnit.test('hasParent', function(assert) {
    var parent = document.createElement('div'),
        child = document.createElement('div');

    document.body.appendChild(parent);
    parent.appendChild(child);

    assert.equal($H.hasParent(child, parent), true, 'Found parent');
    assert.equal($H.hasParent(parent, child), false, 'Not in parent');

    document.body.removeChild(parent);
});

QUnit.test('each', function(assert) {
    var object = { hi: true };
    var array = ['a', 'b', 'c'];
    var loop;

    loop = false;
    $H.each(object, function(value, key) {
        if (key == 'hi' && value === true) {
            loop = true;
        }
    });
    assert.ok(loop, 'object loop');

    loop = 0;
    $H.each(array, function(value, key) {
        if (value) {
            loop++;
        }
    });
    assert.ok(loop == 3, 'array loop');

    loop = 0;
    array.forEach = null;
    $H.each(array, function(value, key) {
        if (value) {
            loop++;
        }
    });
    assert.ok(loop == 3, 'array loop without Array.forEach');
});

QUnit.test('assign', function(assert) {
    assert.expect(2);
    assert.deepEqual(
        $H.assign(
            {a: 1, b: 3},
            {b: 2, c: 3}
        ),
        {a: 1, b: 2, c: 3},
        'Simple extend'
    );

    var src = { foo: true };
    var dest = $H.assign({}, src);
    src.foo = false;
    assert.deepEqual(dest, {foo: true}, 'Clone reference');
});

QUnit.test('test add/removeEventListener', function(assert) {
    function handleEvent() {
        assert.ok(true, 'triggered event');
    }

    assert.expect(2);

    $H.addEventListeners(window, 'testEvent1  testEvent2  ', handleEvent);
    utils.triggerDomEvent(window, 'testEvent1');
    utils.triggerDomEvent(window, 'testEvent2');

    $H.removeEventListeners(window, ' testEvent1 testEvent2 ', handleEvent);
    utils.triggerDomEvent(window, 'testEvent1');
    utils.triggerDomEvent(window, 'testEvent2');
});

QUnit.test('addEventListeners/removeEventListeners default to false and forward explicit listener options', function(assert) {
    var added = [];
    var removed = [];
    var fakeTarget = {
        addEventListener: function(type, handler, opts) {
            added.push({type: type, opts: opts});
        },
        removeEventListener: function(type, handler, opts) {
            removed.push({type: type, opts: opts});
        }
    };
    var noop = function() {};

    $H.addEventListeners(fakeTarget, 'touchstart touchmove touchend mousedown', noop);
    $H.removeEventListeners(fakeTarget, 'touchstart touchmove touchend mousedown', noop);

    assert.strictEqual(added[0].opts, false, 'touchstart defaults to false (does not force {passive: false} globally)');
    assert.strictEqual(added[1].opts, false, 'touchmove defaults to false');
    assert.strictEqual(added[2].opts, false, 'touchend defaults to false');
    assert.strictEqual(added[3].opts, false, 'mousedown defaults to false');
    assert.strictEqual(removed[0].opts, false, 'removeEventListeners defaults to false for touchstart');
    assert.strictEqual(removed[1].opts, false, 'removeEventListeners defaults to false for touchmove');

    added = [];
    removed = [];
    $H.addEventListeners(fakeTarget, 'touchstart touchmove', noop, {passive: false});
    $H.removeEventListeners(fakeTarget, 'touchstart touchmove', noop, {passive: false});
    assert.deepEqual(added[0].opts, {passive: false}, 'explicit {passive: false} forwarded on addEventListeners');
    assert.deepEqual(removed[0].opts, {passive: false}, 'explicit {passive: false} forwarded on removeEventListeners');

    // Verify an explicit non-passive touchmove listener on window can call preventDefault()
    var onWindowTouchMove = function(ev) {
        ev.preventDefault();
    };
    $H.addEventListeners(window, 'touchmove', onWindowTouchMove, {passive: false});
    try {
        var ev = document.createEvent('Event');
        ev.initEvent('touchmove', true, true);
        window.dispatchEvent(ev);
        assert.strictEqual(ev.defaultPrevented, true, 'explicit non-passive window touchmove listener can call preventDefault()');
    } finally {
        $H.removeEventListeners(window, 'touchmove', onWindowTouchMove, {passive: false});
    }
});

QUnit.test('getDirection', function(assert) {
    assert.expect(7);

    assert.equal($H.getDirection(0, 0), Hammer.DIRECTION_NONE, 'zero movement returns DIRECTION_NONE');
    assert.equal($H.getDirection(50, 50), Hammer.DIRECTION_RIGHT, 'positive 45-degree diagonal is not DIRECTION_NONE');
    assert.equal($H.getDirection(-50, -50), Hammer.DIRECTION_LEFT, 'negative 45-degree diagonal is not DIRECTION_NONE');
    assert.equal($H.getDirection(50, -50), Hammer.DIRECTION_RIGHT, 'positive x / negative y diagonal returns DIRECTION_RIGHT');
    assert.equal($H.getDirection(-50, 50), Hammer.DIRECTION_LEFT, 'negative x / positive y diagonal returns DIRECTION_LEFT');
    assert.equal($H.getDirection(10, 50), Hammer.DIRECTION_DOWN, 'mostly downward movement returns DIRECTION_DOWN');
    assert.equal($H.getDirection(10, -50), Hammer.DIRECTION_UP, 'mostly upward movement returns DIRECTION_UP');
});

QUnit.test('getDirection returns DIRECTION_NONE for NaN inputs', function(assert) {
    assert.expect(3);

    assert.equal($H.getDirection(NaN, 0), Hammer.DIRECTION_NONE, 'NaN x returns DIRECTION_NONE');
    assert.equal($H.getDirection(0, NaN), Hammer.DIRECTION_NONE, 'NaN y returns DIRECTION_NONE');
    assert.equal($H.getDirection(NaN, NaN), Hammer.DIRECTION_NONE, 'NaN x and y returns DIRECTION_NONE');
});

QUnit.test('setTimeoutContext binds context and returns clearable timer id', function(assert) {
    var done = assert.async();
    assert.expect(2);

    var ctx = {marker: 'bound'};
    var cancelledCalled = false;

    var cancelledId = $H.setTimeoutContext(function() {
        cancelledCalled = true;
    }, 10, ctx);
    clearTimeout(cancelledId);

    $H.setTimeoutContext(function() {
        assert.equal(this, ctx, 'callback executes with bound context');
        assert.equal(cancelledCalled, false, 'returned timer id can be cancelled with clearTimeout');
        done();
    }, 25, ctx);
});

QUnit.test('invokeArrayArg dispatches method per item only for arrays', function(assert) {
    var seen = [];
    var ctx = {
        collect: function(item) {
            seen.push(this === ctx ? item : 'wrong-context');
        }
    };

    assert.equal($H.invokeArrayArg(['a', 'b', 'c'], 'collect', ctx), true, 'returns true for array');
    assert.deepEqual(seen, ['a', 'b', 'c'], 'invokes named method on context for each array element');

    seen = [];
    assert.equal($H.invokeArrayArg([], 'collect', ctx), true, 'returns true for empty array');
    assert.deepEqual(seen, [], 'does not invoke method for empty array');

    assert.equal($H.invokeArrayArg('single', 'collect', ctx), false, 'returns false for non-array string');
    assert.equal($H.invokeArrayArg({length: 1, 0: 'x'}, 'collect', ctx), false, 'returns false for array-like object');
    assert.deepEqual(seen, [], 'does not invoke method for non-array argument');
});

QUnit.test('each handles null/undefined, context binding, and skips inherited prototype keys', function(assert) {
    var ctx = {tag: 'ctx'};
    var results = [];

    assert.equal($H.each(null, function() { assert.ok(false, 'null should not iterate'); }), undefined, 'null is a no-op');
    assert.equal($H.each(undefined, function() { assert.ok(false, 'undefined should not iterate'); }), undefined, 'undefined is a no-op');

    $H.each(['x', 'y'], function(val, idx) {
        results.push(this.tag + ':' + idx + ':' + val);
    }, ctx);
    assert.deepEqual(results, ['ctx:0:x', 'ctx:1:y'], 'array forEach path preserves context and index');

    results = [];
    $H.each({0: 'm', 1: 'n', length: 2}, function(val, idx) {
        results.push(this.tag + ':' + idx + ':' + val);
    }, ctx);
    assert.deepEqual(results, ['ctx:0:m', 'ctx:1:n'], 'array-like path preserves context and index');

    var proto = {inherited: 1};
    var obj = Object.create(proto);
    obj.own = 2;
    results = [];
    $H.each(obj, function(val, key) {
        results.push(this.tag + ':' + key + ':' + val);
    }, ctx);
    assert.deepEqual(results, ['ctx:own:2'], 'object loop preserves context and skips inherited properties');
});

QUnit.test('deprecate logs warning (with console.log fallback) and preserves call semantics', function(assert) {
    var origWarn = window.console && window.console.warn;
    var origLog = window.console && window.console.log;
    var warnings = [];
    var logs = [];

    if (window.console) {
        window.console.warn = function() {
            warnings.push(Array.prototype.slice.call(arguments).join(' '));
        };
        window.console.log = function() {
            logs.push(Array.prototype.slice.call(arguments).join(' '));
        };
    }

    try {
        var wrapped = $H.deprecate(function(x, y) {
            return this.base + x + y;
        }, 'oldMethod', 'Use newMethod.');

        assert.equal(wrapped.call({base: 10}, 5, 2), 17, 'preserves context, arguments, and return value');
        assert.ok(warnings.length === 1 && warnings[0].indexOf('DEPRECATED METHOD: oldMethod') !== -1, 'logs via console.warn');

        if (window.console) {
            window.console.warn = null;
            assert.equal(wrapped.call({base: 1}, 2, 3), 6, 'works when console.warn is unavailable');
            assert.ok(logs.length === 1 && logs[0].indexOf('DEPRECATED METHOD: oldMethod') !== -1, 'falls back to console.log');
        }
    } finally {
        if (window.console) {
            window.console.warn = origWarn;
            window.console.log = origLog;
        }
    }
});

QUnit.test('assign merges multiple sources in order, skips null/undefined, and returns target', function(assert) {
    var target = {a: 1};
    var ret = $H.assign(target, {a: 2, b: 2}, null, undefined, {b: 3, c: 4});

    assert.strictEqual(ret, target, 'returns the exact target object reference');
    assert.deepEqual(target, {a: 2, b: 3, c: 4}, 'applies multiple sources left-to-right and skips null/undefined');
});

QUnit.test('extend and merge preserve falsy values in merge mode and overwrite otherwise', function(assert) {
    var origWarn = window.console && window.console.warn;
    if (window.console) {
        window.console.warn = function() {};
    }

    try {
        var dest = {a: 1, b: 2};
        assert.strictEqual($H.extend(dest, {b: 20, c: 3}), dest, 'extend returns dest');
        assert.deepEqual(dest, {a: 1, b: 20, c: 3}, 'extend overwrites existing keys');

        var mergeDest = {zero: 0, flag: false, empty: '', nil: null, undef: undefined};
        assert.strictEqual($H.merge(mergeDest, {zero: 9, flag: true, empty: 'x', nil: 1, undef: 'filled', added: 42}),
            mergeDest, 'merge returns dest');
        assert.deepEqual(
            mergeDest,
            {zero: 0, flag: false, empty: '', nil: null, undef: 'filled', added: 42},
            'merge keeps falsy defined values (0, false, "", null) and only fills undefined/missing keys'
        );
    } finally {
        if (window.console) {
            window.console.warn = origWarn;
        }
    }
});

QUnit.test('inherit works without optional properties and does not mutate base prototype', function(assert) {
    function Base() {}
    Base.prototype.greet = function() {
        return 'base';
    };

    function ChildNoProps() {}
    $H.inherit(ChildNoProps, Base);

    var c1 = new ChildNoProps();
    assert.equal(c1.greet(), 'base', 'inherits base prototype methods without properties arg');
    assert.strictEqual(ChildNoProps.prototype.constructor, ChildNoProps, 'sets child constructor properly');

    function ChildOverride() {}
    $H.inherit(ChildOverride, Base, {
        greet: function() {
            return 'child';
        }
    });
    assert.equal(new ChildOverride().greet(), 'child', 'child override takes effect');
    assert.equal(new Base().greet(), 'base', 'Base.prototype is not mutated by child properties');
});

QUnit.test('bindFn forwards multiple arguments and return value', function(assert) {
    var ctx = {factor: 3};
    var fn = $H.bindFn(function(a, b) {
        return (a + b) * this.factor;
    }, ctx);

    assert.equal(fn(2, 4), 18, 'forwards multiple args, binds this, and returns result');
});

QUnit.test('boolOrFn handles function context, arguments, falsy returns, and omitted args', function(assert) {
    assert.equal($H.boolOrFn(function() {
        return false;
    }), false, 'function returning false evaluates to false');

    assert.equal($H.boolOrFn(function(selfObj, arg2) {
        return this === selfObj && this.flag && arg2 === 'ok';
    }, [{flag: true}, 'ok']), true, 'passes args[0] as context and forwards all args');

    assert.equal($H.boolOrFn(function() {
        return arguments.length === 0;
    }), true, 'works cleanly when args are omitted');
});

QUnit.test('ifUndefined only substitutes for undefined, preserving falsy values', function(assert) {
    assert.equal($H.ifUndefined(undefined, 'fallback'), 'fallback', 'replaces undefined');
    assert.equal($H.ifUndefined(null, 'fallback'), null, 'preserves null');
    assert.equal($H.ifUndefined(0, 'fallback'), 0, 'preserves 0');
    assert.equal($H.ifUndefined(false, 'fallback'), false, 'preserves false');
    assert.equal($H.ifUndefined('', 'fallback'), '', 'preserves empty string');
});

QUnit.test('hasParent handles self, deeply nested descendants, detached nodes, and null', function(assert) {
    var root = document.createElement('div');
    var mid = document.createElement('div');
    var leaf = document.createElement('span');
    root.appendChild(mid);
    mid.appendChild(leaf);

    assert.equal($H.hasParent(root, root), true, 'returns true when node equals parent');
    assert.equal($H.hasParent(leaf, root), true, 'returns true for deeply nested descendant');
    assert.equal($H.hasParent(document.createElement('div'), root), false, 'returns false for unrelated node');
    assert.equal($H.hasParent(null, root), false, 'returns false for null node');
});

QUnit.test('hasParent resolves document and attached elements up to window without matching detached nodes', function(assert) {
    var attached = document.createElement('div');
    document.body.appendChild(attached);
    var detached = document.createElement('div');

    try {
        assert.equal($H.hasParent(attached, window), true, 'attached DOM element has window as parent');
        assert.equal($H.hasParent(document, window), true, 'document has window as parent');
        assert.equal($H.hasParent(window, window), true, 'window matches itself');
        assert.equal($H.hasParent(detached, window), false, 'detached element does not match window');
    } finally {
        document.body.removeChild(attached);
    }
});

QUnit.test('hasParent and computeInputData resolve targets across Shadow DOM boundaries', function(assert) {
    var outer = document.createElement('div');
    var host = document.createElement('div');
    outer.appendChild(host);

    // Detached <a> has a string .host property and must never falsely match
    var detachedAnchor = document.createElement('a');
    detachedAnchor.href = 'https://example.com/';
    assert.equal($H.hasParent(detachedAnchor, 'example.com'), false, 'detached anchor .host string does not falsely match');

    if (host.attachShadow) {
        var shadow = host.attachShadow({mode: 'open'});
        var shadowContainer = document.createElement('div');
        var shadowLeaf = document.createElement('button');
        shadowContainer.appendChild(shadowLeaf);
        shadow.appendChild(shadowContainer);

        assert.equal($H.hasParent(shadowLeaf, shadowContainer), true, 'hasParent finds ancestor inside same ShadowRoot');
        assert.equal($H.hasParent(shadowLeaf, host), true, 'hasParent crosses ShadowRoot to shadow host');
        assert.equal($H.hasParent(shadowLeaf, outer), true, 'hasParent crosses ShadowRoot to outer ancestor');

        // 1. Manager attached inside ShadowRoot; window-level listener retargets srcEvent.target to host
        var mgrInside = {element: shadowContainer, session: {}};
        var inputInside = {
            eventType: Hammer.INPUT_MOVE,
            pointers: [{clientX: 10, clientY: 10}],
            changedPointers: [{clientX: 10, clientY: 10}],
            srcEvent: {
                target: host,
                composedPath: function() {
                    return [shadowLeaf, shadowContainer, shadow, host, outer];
                }
            }
        };
        $H.computeInputData(mgrInside, inputInside);
        assert.strictEqual(inputInside.target, shadowLeaf, 'computeInputData uses composedPath()[0] for manager inside ShadowRoot');

        // 2. Manager attached to shadow host; resolves inner shadow target across ShadowRoot
        var mgrHost = {element: host, session: {}};
        var inputHost = {
            eventType: Hammer.INPUT_MOVE,
            pointers: [{clientX: 10, clientY: 10}],
            changedPointers: [{clientX: 10, clientY: 10}],
            srcEvent: {
                target: host,
                composedPath: function() {
                    return [shadowLeaf, shadowContainer, shadow, host, outer];
                }
            }
        };
        $H.computeInputData(mgrHost, inputHost);
        assert.strictEqual(inputHost.target, shadowLeaf, 'computeInputData resolves inner target for manager on shadow host');

        // 3. Empty composedPath() falls back cleanly to srcEvent.target
        var inputEmptyPath = {
            eventType: Hammer.INPUT_MOVE,
            pointers: [{clientX: 10, clientY: 10}],
            changedPointers: [{clientX: 10, clientY: 10}],
            srcEvent: {
                target: shadowLeaf,
                composedPath: function() {
                    return [];
                }
            }
        };
        $H.computeInputData(mgrInside, inputEmptyPath);
        assert.strictEqual(inputEmptyPath.target, shadowLeaf, 'empty composedPath() falls back to srcEvent.target');
    }
});

QUnit.test('inStr detects substrings at start, middle, empty needle, and misses', function(assert) {
    assert.equal($H.inStr('pan-x pan-y', 'pan-x'), true, 'matches at index 0');
    assert.equal($H.inStr('pan-x pan-y', 'pan-y'), true, 'matches later in string');
    assert.equal($H.inStr('pan-x pan-y', 'none'), false, 'returns false when absent');
    assert.equal($H.inStr('abc', ''), true, 'matches empty substring');
});

QUnit.test('splitStr handles tabs, newlines, and single token', function(assert) {
    assert.deepEqual($H.splitStr('pan\t swipe\n  tap'), ['pan', 'swipe', 'tap'], 'splits on mixed whitespace');
    assert.deepEqual($H.splitStr('tap'), ['tap'], 'returns single-element array for single token');
});

QUnit.test('inArray loop fallback works on array-like objects without indexOf', function(assert) {
    var arrayLike = {0: 'a', 1: 'b', length: 2};
    assert.equal($H.inArray(arrayLike, 'b'), 1, 'finds item without Array.prototype.indexOf');
    assert.equal($H.inArray(arrayLike, 'z'), -1, 'returns -1 when absent without indexOf');
});

QUnit.test('toArray preserves element values, converts arguments, and returns a shallow copy', function(assert) {
    assert.deepEqual($H.toArray({0: 'x', 1: 'y', length: 2}), ['x', 'y'], 'preserves array-like element values');

    var argsArr = (function() {
        return $H.toArray(arguments);
    })(1, 2, 3);
    assert.deepEqual(argsArr, [1, 2, 3], 'converts arguments object to real Array');

    var orig = [1, 2];
    var copy = $H.toArray(orig);
    copy.push(3);
    assert.deepEqual(orig, [1, 2], 'returned array is an independent shallow copy');
});

QUnit.test('uniqueArray handles primitives, sorting without key, first-seen preservation, and empty input', function(assert) {
    assert.deepEqual($H.uniqueArray([3, 1, 2, 1, 3]), [3, 1, 2], 'deduplicates primitives preserving first-seen order');
    assert.deepEqual($H.uniqueArray(['c', 'a', 'b', 'a'], null, true), ['a', 'b', 'c'], 'deduplicates and sorts primitives without key');
    assert.deepEqual($H.uniqueArray([
        {id: 1, tag: 'first'},
        {id: 2, tag: 'only'},
        {id: 1, tag: 'second'}
    ], 'id'), [
        {id: 1, tag: 'first'},
        {id: 2, tag: 'only'}
    ], 'keeps the first element when duplicate keys occur');
    assert.deepEqual($H.uniqueArray([]), [], 'empty array returns empty array');
});

QUnit.test('prefixed prefers unprefixed property and checks multiple vendor prefixes', function(assert) {
    assert.equal($H.prefixed({foo: 1, webkitFoo: 2}, 'foo'), 'foo', 'prefers unprefixed over vendor-prefixed');
    assert.equal($H.prefixed({MozFoo: 1}, 'foo'), 'MozFoo', 'finds Moz-prefixed property');
    assert.equal($H.prefixed({msFoo: 1}, 'foo'), 'msFoo', 'finds ms-prefixed property');
});

QUnit.test('uniqueId generates monotonically increasing numbers', function(assert) {
    var a = $H.uniqueId();
    var b = $H.uniqueId();
    var c = $H.uniqueId();
    assert.ok(typeof a === 'number' && a < b && b < c, 'each call returns a strictly greater numeric id');
});

QUnit.test('getWindowForElement resolves window for elements, document, and parentWindow fallback', function(assert) {
    var div = document.createElement('div');
    assert.strictEqual($H.getWindowForElement(div), window, 'returns window for DOM element');
    assert.strictEqual($H.getWindowForElement(document), window, 'returns window for document');

    var fakeWin = {fake: true};
    assert.strictEqual($H.getWindowForElement({ownerDocument: {parentWindow: fakeWin}}), fakeWin, 'falls back to doc.parentWindow');
});

QUnit.test('prefixed returns undefined safely when target object is null or undefined', function(assert) {
    assert.strictEqual($H.prefixed(null, 'touchAction'), undefined, 'returns undefined for null');
    assert.strictEqual($H.prefixed(undefined, 'touchAction'), undefined, 'returns undefined for undefined');
});

QUnit.test('base prototypes preserve their own constructor property', function(assert) {
    assert.strictEqual(Hammer.Recognizer.prototype.constructor, Hammer.Recognizer, 'Recognizer.prototype.constructor is Hammer.Recognizer');
    assert.strictEqual((new Hammer.Recognizer()).constructor, Hammer.Recognizer, 'Recognizer instance constructor is Hammer.Recognizer');
    assert.strictEqual(Hammer.Manager.prototype.constructor, Hammer.Manager, 'Manager.prototype.constructor is Hammer.Manager');
    assert.strictEqual(Hammer.Input.prototype.constructor, Hammer.Input, 'Input.prototype.constructor is Hammer.Input');
    assert.strictEqual(Hammer.TouchAction.prototype.constructor, Hammer.TouchAction, 'TouchAction.prototype.constructor is Hammer.TouchAction');
});

QUnit.test('getCenter and simpleCloneInputData preserve sub-pixel pointer positions', function(assert) {
    var singleCenter = $H.getCenter([{clientX: 10.25, clientY: 20.75}]);
    assert.strictEqual(singleCenter.x, 10.25, 'single-pointer center.x preserves sub-pixel precision');
    assert.strictEqual(singleCenter.y, 20.75, 'single-pointer center.y preserves sub-pixel precision');

    var multiCenter = $H.getCenter([
        {clientX: 10.5, clientY: 20.25},
        {clientX: 11.0, clientY: 21.25}
    ]);
    assert.strictEqual(multiCenter.x, 10.75, 'multi-pointer center.x preserves sub-pixel precision');
    assert.strictEqual(multiCenter.y, 20.75, 'multi-pointer center.y preserves sub-pixel precision');

    var cloned = $H.simpleCloneInputData({
        pointers: [{clientX: 12.4, clientY: 34.6}],
        deltaX: 0,
        deltaY: 0
    });
    assert.strictEqual(cloned.pointers[0].clientX, 12.4, 'simpleCloneInputData preserves fractional clientX');
    assert.strictEqual(cloned.pointers[0].clientY, 34.6, 'simpleCloneInputData preserves fractional clientY');
    assert.strictEqual(cloned.center.x, 12.4, 'cloned center.x preserves fractional clientX');
    assert.strictEqual(cloned.center.y, 34.6, 'cloned center.y preserves fractional clientY');
});

QUnit.test('getCenter returns {x: 0, y: 0} instead of NaN for empty pointers array', function(assert) {
    var emptyCenter = $H.getCenter([]);
    assert.strictEqual(emptyCenter.x, 0, 'empty pointers center.x is 0');
    assert.strictEqual(emptyCenter.y, 0, 'empty pointers center.y is 0');
});

QUnit.test('each handles null-prototype objects without throwing', function(assert) {
    var obj = Object.create(null);
    obj.a = 1;
    obj.b = 2;

    var pairs = [];
    Hammer.each(obj, function(val, key) {
        pairs.push(key + ':' + val);
    });
    assert.deepEqual(pairs.sort(), ['a:1', 'b:2'], 'Hammer.each iterates Object.create(null) safely');
});

QUnit.test('prefixed, each, getWindowForElement, and computeInputData guard edge cases and skip light-DOM composedPath', function(assert) {
    // 1. prefixed guards empty / non-string property names
    assert.strictEqual($H.prefixed(window, ''), undefined, 'prefixed returns undefined for empty string');
    assert.strictEqual($H.prefixed(window, null), undefined, 'prefixed returns undefined for null property');
    assert.strictEqual($H.prefixed(window, 123), undefined, 'prefixed returns undefined for non-string property');

    // 2. each ignores truthy non-function forEach properties
    var seen = [];
    $H.each({forEach: true, a: 1}, function(val, key) {
        seen.push(key + ':' + val);
    });
    assert.deepEqual(seen.sort(), ['a:1', 'forEach:true'], 'each checks typeof obj.forEach === function');

    // 3. getWindowForElement returns cross-realm window objects directly
    var fakeIframeWin = {};
    fakeIframeWin.window = fakeIframeWin;
    assert.strictEqual($H.getWindowForElement(fakeIframeWin), fakeIframeWin, 'getWindowForElement returns window-like self-referential object directly');

    // 4. computeInputData skips composedPath() on regular Light DOM targets (no shadowRoot)
    var parent = document.createElement('div');
    var child = document.createElement('span');
    parent.appendChild(child);
    var composedCalls = 0;
    var lightInput = {
        eventType: Hammer.INPUT_MOVE,
        pointers: [{clientX: 10, clientY: 10}],
        changedPointers: [{clientX: 10, clientY: 10}],
        srcEvent: {
            target: child,
            composedPath: function() {
                composedCalls++;
                return [child, parent];
            }
        }
    };
    $H.computeInputData({element: parent, session: {}}, lightInput);
    assert.equal(composedCalls, 0, 'composedPath() is not called for regular Light DOM targets');
    assert.strictEqual(lightInput.target, child, 'light DOM target still resolves accurately');
});
