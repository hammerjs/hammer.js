module('utils');

// for the tests, all hammer properties and methods of Hammer are exposed to window.$H

test('get/set prefixed util', function() {
    ok($H.prefixed(window, 'FakeProperty') === undefined, 'non existent property returns undefined');

    window.webkitFakeProperty = 1337;
    ok($H.prefixed(window, 'FakeProperty') == 'webkitFakeProperty', 'existent prefixed property returns the prefixed name');

    delete window.webkitFakeProperty;
});

test('fnBind', function() {
    var context = { a: true };

    $H.bindFn(function(b) {
        ok(this.a === true, 'bindFn scope');
        ok(b === 123, 'bindFn argument');
    }, context)(123);
});

test('Inherit objects', function() {
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

    ok(inst.name == true, 'child has extended from base');
    ok(inst.newMethod, 'child has a new method');
    ok(Child.prototype.newMethod, 'child has a new prototype method');
    ok(inst instanceof Child, 'is instanceof Child');
    ok(inst instanceof Base, 'is instanceof Base');
    ok(inst._super === Base.prototype, '_super is ref to prototype of Base');
});

test('toArray', function() {
    ok(Array.isArray($H.toArray({ 0: true, 1: 'second', length: 2 })), 'converted an array-like object to an array');
    ok(Array.isArray($H.toArray([true, true])), 'array stays an array');
});

test('inArray', function() {
    ok($H.inArray([1, 2, 3, 4, 'hammer'], 'hammer') === 4, 'found item and returned the index');
    ok($H.inArray([1, 2, 3, 4, 'hammer'], 'notfound') === -1, 'not found an item and returned -1');
    ok($H.inArray([
        {id: 2},
        {id: 24}
    ], '24', 'id') === 1, 'find by key and return the index');
    ok($H.inArray([
        {id: 2},
        {id: 24}
    ], '22', 'id') === -1, 'not found by key and return -1');
});

test('splitStr', function() {
    deepEqual($H.splitStr(' a  b  c d   '), ['a', 'b', 'c', 'd'], 'str split valid');
    deepEqual($H.splitStr(''), [], 'empty string returns empty array');
    deepEqual($H.splitStr('   '), [], 'whitespace string returns empty array');
});

test('uniqueArray', function() {
    deepEqual($H.uniqueArray([
        {id: 1},
        {id: 2},
        {id: 2}
    ], 'id'), [
        {id: 1},
        {id: 2}
    ], 'remove duplicate ids');

    deepEqual($H.uniqueArray([
        {id: 3},
        {id: 1},
        {id: 2},
        {id: 1}
    ], 'id', true), [
        {id: 1},
        {id: 2},
        {id: 3}
    ], 'remove duplicate ids and sort ascending by key');

    deepEqual($H.uniqueArray([
        {id: 2},
        {id: 1}
    ], 'id', true), [
        {id: 1},
        {id: 2}
    ], 'sort two reversed items ascending by key');
});

test('boolOrFn', function() {
    equal($H.boolOrFn(true), true, 'Passing an boolean');
    equal($H.boolOrFn(false), false, 'Passing an boolean');
    equal($H.boolOrFn(function() {
        return true;
    }), true, 'Passing an boolean');
    equal($H.boolOrFn(1), true, 'Passing an integer');
});

test('hasParent', function() {
    var parent = document.createElement('div'),
        child = document.createElement('div');

    document.body.appendChild(parent);
    parent.appendChild(child);

    equal($H.hasParent(child, parent), true, 'Found parent');
    equal($H.hasParent(parent, child), false, 'Not in parent');

    document.body.removeChild(parent);
});

test('each', function() {
    var object = { hi: true };
    var array = ['a', 'b', 'c'];
    var loop;

    loop = false;
    $H.each(object, function(value, key) {
        if (key == 'hi' && value === true) {
            loop = true;
        }
    });
    ok(loop, 'object loop');

    loop = 0;
    $H.each(array, function(value, key) {
        if (value) {
            loop++;
        }
    });
    ok(loop == 3, 'array loop');

    loop = 0;
    array.forEach = null;
    $H.each(array, function(value, key) {
        if (value) {
            loop++;
        }
    });
    ok(loop == 3, 'array loop without Array.forEach');
});

test('assign', function() {
    expect(2);
    deepEqual(
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
    deepEqual(dest, {foo: true}, 'Clone reference');
});

test('test add/removeEventListener', function() {
    function handleEvent() {
        ok(true, 'triggered event');
    }

    expect(2);

    $H.addEventListeners(window, 'testEvent1  testEvent2  ', handleEvent);
    utils.triggerDomEvent(window, 'testEvent1');
    utils.triggerDomEvent(window, 'testEvent2');

    $H.removeEventListeners(window, ' testEvent1 testEvent2 ', handleEvent);
    utils.triggerDomEvent(window, 'testEvent1');
    utils.triggerDomEvent(window, 'testEvent2');
});

test('addEventListeners/removeEventListeners pass {passive: false} for touchstart/touchmove so root targets can preventDefault', function() {
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

    deepEqual(added[0].opts, {passive: false}, 'touchstart registers with {passive: false}');
    deepEqual(added[1].opts, {passive: false}, 'touchmove registers with {passive: false}');
    strictEqual(added[2].opts, false, 'touchend registers with false');
    strictEqual(added[3].opts, false, 'mousedown registers with false');
    deepEqual(removed[0].opts, {passive: false}, 'removeEventListeners matches {passive: false} for touchstart');
    deepEqual(removed[1].opts, {passive: false}, 'removeEventListeners matches {passive: false} for touchmove');

    // Verify a real touchmove listener on window can call preventDefault() without passive rejection
    var onWindowTouchMove = function(ev) {
        ev.preventDefault();
    };
    $H.addEventListeners(window, 'touchmove', onWindowTouchMove);
    try {
        var ev = document.createEvent('Event');
        ev.initEvent('touchmove', true, true);
        window.dispatchEvent(ev);
        strictEqual(ev.defaultPrevented, true, 'window touchmove listener successfully calls preventDefault()');
    } finally {
        $H.removeEventListeners(window, 'touchmove', onWindowTouchMove);
    }
});

test('getDirection', function() {
    expect(7);

    equal($H.getDirection(0, 0), Hammer.DIRECTION_NONE, 'zero movement returns DIRECTION_NONE');
    equal($H.getDirection(50, 50), Hammer.DIRECTION_RIGHT, 'positive 45-degree diagonal is not DIRECTION_NONE');
    equal($H.getDirection(-50, -50), Hammer.DIRECTION_LEFT, 'negative 45-degree diagonal is not DIRECTION_NONE');
    equal($H.getDirection(50, -50), Hammer.DIRECTION_RIGHT, 'positive x / negative y diagonal returns DIRECTION_RIGHT');
    equal($H.getDirection(-50, 50), Hammer.DIRECTION_LEFT, 'negative x / positive y diagonal returns DIRECTION_LEFT');
    equal($H.getDirection(10, 50), Hammer.DIRECTION_DOWN, 'mostly downward movement returns DIRECTION_DOWN');
    equal($H.getDirection(10, -50), Hammer.DIRECTION_UP, 'mostly upward movement returns DIRECTION_UP');
});

asyncTest('setTimeoutContext binds context and returns clearable timer id', function() {
    expect(2);

    var ctx = {marker: 'bound'};
    var cancelledCalled = false;

    var cancelledId = $H.setTimeoutContext(function() {
        cancelledCalled = true;
    }, 10, ctx);
    clearTimeout(cancelledId);

    $H.setTimeoutContext(function() {
        equal(this, ctx, 'callback executes with bound context');
        equal(cancelledCalled, false, 'returned timer id can be cancelled with clearTimeout');
        start();
    }, 25, ctx);
});

test('invokeArrayArg dispatches method per item only for arrays', function() {
    var seen = [];
    var ctx = {
        collect: function(item) {
            seen.push(this === ctx ? item : 'wrong-context');
        }
    };

    equal($H.invokeArrayArg(['a', 'b', 'c'], 'collect', ctx), true, 'returns true for array');
    deepEqual(seen, ['a', 'b', 'c'], 'invokes named method on context for each array element');

    seen = [];
    equal($H.invokeArrayArg([], 'collect', ctx), true, 'returns true for empty array');
    deepEqual(seen, [], 'does not invoke method for empty array');

    equal($H.invokeArrayArg('single', 'collect', ctx), false, 'returns false for non-array string');
    equal($H.invokeArrayArg({length: 1, 0: 'x'}, 'collect', ctx), false, 'returns false for array-like object');
    deepEqual(seen, [], 'does not invoke method for non-array argument');
});

test('each handles null/undefined, context binding, and skips inherited prototype keys', function() {
    var ctx = {tag: 'ctx'};
    var results = [];

    equal($H.each(null, function() { ok(false, 'null should not iterate'); }), undefined, 'null is a no-op');
    equal($H.each(undefined, function() { ok(false, 'undefined should not iterate'); }), undefined, 'undefined is a no-op');

    $H.each(['x', 'y'], function(val, idx) {
        results.push(this.tag + ':' + idx + ':' + val);
    }, ctx);
    deepEqual(results, ['ctx:0:x', 'ctx:1:y'], 'array forEach path preserves context and index');

    results = [];
    $H.each({0: 'm', 1: 'n', length: 2}, function(val, idx) {
        results.push(this.tag + ':' + idx + ':' + val);
    }, ctx);
    deepEqual(results, ['ctx:0:m', 'ctx:1:n'], 'array-like path preserves context and index');

    var proto = {inherited: 1};
    var obj = Object.create(proto);
    obj.own = 2;
    results = [];
    $H.each(obj, function(val, key) {
        results.push(this.tag + ':' + key + ':' + val);
    }, ctx);
    deepEqual(results, ['ctx:own:2'], 'object loop preserves context and skips inherited properties');
});

test('deprecate logs warning (with console.log fallback) and preserves call semantics', function() {
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

        equal(wrapped.call({base: 10}, 5, 2), 17, 'preserves context, arguments, and return value');
        ok(warnings.length === 1 && warnings[0].indexOf('DEPRECATED METHOD: oldMethod') !== -1, 'logs via console.warn');

        if (window.console) {
            window.console.warn = null;
            equal(wrapped.call({base: 1}, 2, 3), 6, 'works when console.warn is unavailable');
            ok(logs.length === 1 && logs[0].indexOf('DEPRECATED METHOD: oldMethod') !== -1, 'falls back to console.log');
        }
    } finally {
        if (window.console) {
            window.console.warn = origWarn;
            window.console.log = origLog;
        }
    }
});

test('assign merges multiple sources in order, skips null/undefined, and returns target', function() {
    var target = {a: 1};
    var ret = $H.assign(target, {a: 2, b: 2}, null, undefined, {b: 3, c: 4});

    strictEqual(ret, target, 'returns the exact target object reference');
    deepEqual(target, {a: 2, b: 3, c: 4}, 'applies multiple sources left-to-right and skips null/undefined');
});

test('extend and merge preserve falsy values in merge mode and overwrite otherwise', function() {
    var origWarn = window.console && window.console.warn;
    if (window.console) {
        window.console.warn = function() {};
    }

    try {
        var dest = {a: 1, b: 2};
        strictEqual($H.extend(dest, {b: 20, c: 3}), dest, 'extend returns dest');
        deepEqual(dest, {a: 1, b: 20, c: 3}, 'extend overwrites existing keys');

        var mergeDest = {zero: 0, flag: false, empty: '', nil: null, undef: undefined};
        strictEqual($H.merge(mergeDest, {zero: 9, flag: true, empty: 'x', nil: 1, undef: 'filled', added: 42}),
            mergeDest, 'merge returns dest');
        deepEqual(
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

test('inherit works without optional properties and does not mutate base prototype', function() {
    function Base() {}
    Base.prototype.greet = function() {
        return 'base';
    };

    function ChildNoProps() {}
    $H.inherit(ChildNoProps, Base);

    var c1 = new ChildNoProps();
    equal(c1.greet(), 'base', 'inherits base prototype methods without properties arg');
    strictEqual(ChildNoProps.prototype.constructor, ChildNoProps, 'sets child constructor properly');

    function ChildOverride() {}
    $H.inherit(ChildOverride, Base, {
        greet: function() {
            return 'child';
        }
    });
    equal(new ChildOverride().greet(), 'child', 'child override takes effect');
    equal(new Base().greet(), 'base', 'Base.prototype is not mutated by child properties');
});

test('bindFn forwards multiple arguments and return value', function() {
    var ctx = {factor: 3};
    var fn = $H.bindFn(function(a, b) {
        return (a + b) * this.factor;
    }, ctx);

    equal(fn(2, 4), 18, 'forwards multiple args, binds this, and returns result');
});

test('boolOrFn handles function context, arguments, falsy returns, and omitted args', function() {
    equal($H.boolOrFn(function() {
        return false;
    }), false, 'function returning false evaluates to false');

    equal($H.boolOrFn(function(selfObj, arg2) {
        return this === selfObj && this.flag && arg2 === 'ok';
    }, [{flag: true}, 'ok']), true, 'passes args[0] as context and forwards all args');

    equal($H.boolOrFn(function() {
        return arguments.length === 0;
    }), true, 'works cleanly when args are omitted');
});

test('ifUndefined only substitutes for undefined, preserving falsy values', function() {
    equal($H.ifUndefined(undefined, 'fallback'), 'fallback', 'replaces undefined');
    equal($H.ifUndefined(null, 'fallback'), null, 'preserves null');
    equal($H.ifUndefined(0, 'fallback'), 0, 'preserves 0');
    equal($H.ifUndefined(false, 'fallback'), false, 'preserves false');
    equal($H.ifUndefined('', 'fallback'), '', 'preserves empty string');
});

test('hasParent handles self, deeply nested descendants, detached nodes, and null', function() {
    var root = document.createElement('div');
    var mid = document.createElement('div');
    var leaf = document.createElement('span');
    root.appendChild(mid);
    mid.appendChild(leaf);

    equal($H.hasParent(root, root), true, 'returns true when node equals parent');
    equal($H.hasParent(leaf, root), true, 'returns true for deeply nested descendant');
    equal($H.hasParent(document.createElement('div'), root), false, 'returns false for unrelated node');
    equal($H.hasParent(null, root), false, 'returns false for null node');
});

test('hasParent and computeInputData resolve targets across Shadow DOM boundaries', function() {
    var outer = document.createElement('div');
    var host = document.createElement('div');
    outer.appendChild(host);

    // Detached <a> has a string .host property and must never falsely match
    var detachedAnchor = document.createElement('a');
    detachedAnchor.href = 'https://example.com/';
    equal($H.hasParent(detachedAnchor, 'example.com'), false, 'detached anchor .host string does not falsely match');

    if (host.attachShadow) {
        var shadow = host.attachShadow({mode: 'open'});
        var shadowContainer = document.createElement('div');
        var shadowLeaf = document.createElement('button');
        shadowContainer.appendChild(shadowLeaf);
        shadow.appendChild(shadowContainer);

        equal($H.hasParent(shadowLeaf, shadowContainer), true, 'hasParent finds ancestor inside same ShadowRoot');
        equal($H.hasParent(shadowLeaf, host), true, 'hasParent crosses ShadowRoot to shadow host');
        equal($H.hasParent(shadowLeaf, outer), true, 'hasParent crosses ShadowRoot to outer ancestor');

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
        strictEqual(inputInside.target, shadowLeaf, 'computeInputData uses composedPath()[0] for manager inside ShadowRoot');

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
        strictEqual(inputHost.target, shadowLeaf, 'computeInputData resolves inner target for manager on shadow host');

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
        strictEqual(inputEmptyPath.target, shadowLeaf, 'empty composedPath() falls back to srcEvent.target');
    }
});

test('inStr detects substrings at start, middle, empty needle, and misses', function() {
    equal($H.inStr('pan-x pan-y', 'pan-x'), true, 'matches at index 0');
    equal($H.inStr('pan-x pan-y', 'pan-y'), true, 'matches later in string');
    equal($H.inStr('pan-x pan-y', 'none'), false, 'returns false when absent');
    equal($H.inStr('abc', ''), true, 'matches empty substring');
});

test('splitStr handles tabs, newlines, and single token', function() {
    deepEqual($H.splitStr('pan\t swipe\n  tap'), ['pan', 'swipe', 'tap'], 'splits on mixed whitespace');
    deepEqual($H.splitStr('tap'), ['tap'], 'returns single-element array for single token');
});

test('inArray loop fallback works on array-like objects without indexOf', function() {
    var arrayLike = {0: 'a', 1: 'b', length: 2};
    equal($H.inArray(arrayLike, 'b'), 1, 'finds item without Array.prototype.indexOf');
    equal($H.inArray(arrayLike, 'z'), -1, 'returns -1 when absent without indexOf');
});

test('toArray preserves element values, converts arguments, and returns a shallow copy', function() {
    deepEqual($H.toArray({0: 'x', 1: 'y', length: 2}), ['x', 'y'], 'preserves array-like element values');

    var argsArr = (function() {
        return $H.toArray(arguments);
    })(1, 2, 3);
    deepEqual(argsArr, [1, 2, 3], 'converts arguments object to real Array');

    var orig = [1, 2];
    var copy = $H.toArray(orig);
    copy.push(3);
    deepEqual(orig, [1, 2], 'returned array is an independent shallow copy');
});

test('uniqueArray handles primitives, sorting without key, first-seen preservation, and empty input', function() {
    deepEqual($H.uniqueArray([3, 1, 2, 1, 3]), [3, 1, 2], 'deduplicates primitives preserving first-seen order');
    deepEqual($H.uniqueArray(['c', 'a', 'b', 'a'], null, true), ['a', 'b', 'c'], 'deduplicates and sorts primitives without key');
    deepEqual($H.uniqueArray([
        {id: 1, tag: 'first'},
        {id: 2, tag: 'only'},
        {id: 1, tag: 'second'}
    ], 'id'), [
        {id: 1, tag: 'first'},
        {id: 2, tag: 'only'}
    ], 'keeps the first element when duplicate keys occur');
    deepEqual($H.uniqueArray([]), [], 'empty array returns empty array');
});

test('prefixed prefers unprefixed property and checks multiple vendor prefixes', function() {
    equal($H.prefixed({foo: 1, webkitFoo: 2}, 'foo'), 'foo', 'prefers unprefixed over vendor-prefixed');
    equal($H.prefixed({MozFoo: 1}, 'foo'), 'MozFoo', 'finds Moz-prefixed property');
    equal($H.prefixed({msFoo: 1}, 'foo'), 'msFoo', 'finds ms-prefixed property');
});

test('uniqueId generates monotonically increasing numbers', function() {
    var a = $H.uniqueId();
    var b = $H.uniqueId();
    var c = $H.uniqueId();
    ok(typeof a === 'number' && a < b && b < c, 'each call returns a strictly greater numeric id');
});

test('getWindowForElement resolves window for elements, document, and parentWindow fallback', function() {
    var div = document.createElement('div');
    strictEqual($H.getWindowForElement(div), window, 'returns window for DOM element');
    strictEqual($H.getWindowForElement(document), window, 'returns window for document');

    var fakeWin = {fake: true};
    strictEqual($H.getWindowForElement({ownerDocument: {parentWindow: fakeWin}}), fakeWin, 'falls back to doc.parentWindow');
});

test('prefixed returns undefined safely when target object is null or undefined', function() {
    strictEqual($H.prefixed(null, 'touchAction'), undefined, 'returns undefined for null');
    strictEqual($H.prefixed(undefined, 'touchAction'), undefined, 'returns undefined for undefined');
});

test('base prototypes preserve their own constructor property', function() {
    strictEqual(Hammer.Recognizer.prototype.constructor, Hammer.Recognizer, 'Recognizer.prototype.constructor is Hammer.Recognizer');
    strictEqual((new Hammer.Recognizer()).constructor, Hammer.Recognizer, 'Recognizer instance constructor is Hammer.Recognizer');
    strictEqual(Hammer.Manager.prototype.constructor, Hammer.Manager, 'Manager.prototype.constructor is Hammer.Manager');
    strictEqual(Hammer.Input.prototype.constructor, Hammer.Input, 'Input.prototype.constructor is Hammer.Input');
    strictEqual(Hammer.TouchAction.prototype.constructor, Hammer.TouchAction, 'TouchAction.prototype.constructor is Hammer.TouchAction');
});

test('getCenter and simpleCloneInputData preserve sub-pixel pointer positions', function() {
    var singleCenter = $H.getCenter([{clientX: 10.25, clientY: 20.75}]);
    strictEqual(singleCenter.x, 10.25, 'single-pointer center.x preserves sub-pixel precision');
    strictEqual(singleCenter.y, 20.75, 'single-pointer center.y preserves sub-pixel precision');

    var multiCenter = $H.getCenter([
        {clientX: 10.5, clientY: 20.25},
        {clientX: 11.0, clientY: 21.25}
    ]);
    strictEqual(multiCenter.x, 10.75, 'multi-pointer center.x preserves sub-pixel precision');
    strictEqual(multiCenter.y, 20.75, 'multi-pointer center.y preserves sub-pixel precision');

    var cloned = $H.simpleCloneInputData({
        pointers: [{clientX: 12.4, clientY: 34.6}],
        deltaX: 0,
        deltaY: 0
    });
    strictEqual(cloned.pointers[0].clientX, 12.4, 'simpleCloneInputData preserves fractional clientX');
    strictEqual(cloned.pointers[0].clientY, 34.6, 'simpleCloneInputData preserves fractional clientY');
    strictEqual(cloned.center.x, 12.4, 'cloned center.x preserves fractional clientX');
    strictEqual(cloned.center.y, 34.6, 'cloned center.y preserves fractional clientY');
});

test('getCenter returns {x: 0, y: 0} instead of NaN for empty pointers array', function() {
    var emptyCenter = $H.getCenter([]);
    strictEqual(emptyCenter.x, 0, 'empty pointers center.x is 0');
    strictEqual(emptyCenter.y, 0, 'empty pointers center.y is 0');
});

test('each handles null-prototype objects without throwing', function() {
    var obj = Object.create(null);
    obj.a = 1;
    obj.b = 2;

    var pairs = [];
    Hammer.each(obj, function(val, key) {
        pairs.push(key + ':' + val);
    });
    deepEqual(pairs.sort(), ['a:1', 'b:2'], 'Hammer.each iterates Object.create(null) safely');
});
