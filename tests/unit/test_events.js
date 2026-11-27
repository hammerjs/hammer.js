module('eventEmitter');

test('test the eventemitter', function() {
    expect(6);

    var ee = new Hammer.Manager(utils.createHitArea());
    var inputData = {
        target: document.body,
        srcEvent: {
            preventDefault: function() {
                ok(true, 'preventDefault ref');
            },
            target: document.body
        }
    };

    function event3Handler() {
        ok(true, 'emitted event3');
    }

    ee.on('testEvent1', function() {
        ok(true, 'emitted event');
    });
    ee.on('testEvent2', function(ev) {
        ok(true, 'emitted event');
        ev.preventDefault();
        ok(ev.target === document.body, 'target is the body');
    });
    ee.on('testEvent3', event3Handler);

    ee.emit('testEvent1', inputData);
    ee.emit('testEvent2', inputData);
    ee.emit('testEvent3', inputData);

    // unbind testEvent2
    ee.off('testEvent2');
    ee.off('testEvent3', event3Handler);

    ee.emit('testEvent1', inputData); // should trigger testEvent1 again
    ee.emit('testEvent2', inputData); // doenst trigger a thing
    ee.emit('testEvent3', inputData); // doenst trigger a thing

    // destroy
    ee.destroy();

    ee.emit('testEvent1', inputData); // doenst trigger a thing
    ee.emit('testEvent2', inputData); // doenst trigger a thing
    ee.emit('testEvent3', inputData); // doenst trigger a thing
});

/*
 * Hammer.Manager.off method : exception handling
 */
test("When Hammer.Manager didn't attach an event, 'off' method is ignored", function() {
    var count = 0;
    hammer = new Hammer(el, { inputTarget: document.body });
    hammer.off("swipeleft", function(e) {
        count++;
    });
    ok(true, "nothing");
    hammer.destroy();
});

test("'off' with an unregistered handler should not remove existing handlers", function() {
    expect(2);

    var ee = new Hammer.Manager(utils.createHitArea());
    var count1 = 0;
    var count2 = 0;
    var inputData = {
        target: document.body,
        srcEvent: {
            preventDefault: function() {},
            target: document.body
        }
    };

    function handler1() {
        count1++;
    }
    function handler2() {
        count2++;
    }
    function unregisteredHandler() {}

    ee.on('tap', handler1);
    ee.on('tap', handler2);
    ee.off('tap', unregisteredHandler);

    ee.emit('tap', inputData);

    equal(count1, 1, 'first handler still called');
    equal(count2, 1, 'last handler was not mistakenly spliced out');

    ee.destroy();
});

test("'on' ignores duplicate registrations of the same event and handler", function() {
    expect(5);

    var ee = new Hammer.Manager(utils.createHitArea());
    var count1 = 0;
    var count2 = 0;
    var inputData = {
        target: document.body,
        srcEvent: {
            preventDefault: function() {},
            target: document.body
        }
    };

    function handler1() {
        count1++;
    }
    function handler2() {
        count2++;
    }

    ee.on('tap', handler1);
    ee.on('tap', handler1);
    ee.on('tap tap press', handler1);
    ee.on('tap', handler2);

    ee.emit('tap', inputData);
    equal(count1, 1, 'duplicate handler for tap only invoked once');
    equal(count2, 1, 'distinct handler for tap still invoked');

    ee.emit('press', inputData);
    equal(count1, 2, 'same handler still registered on other event names');

    ee.off('tap', handler1);
    ee.emit('tap', inputData);
    equal(count1, 2, 'single off() completely unregisters handler');
    equal(count2, 2, 'other handler remains active');

    ee.destroy();
});

test("'off' deletes empty handler buckets and 'emit' reuses preventDefault wrapper", function() {
    expect(3);

    var ee = new Hammer.Manager(utils.createHitArea(), {domEvents: true});
    var fn = function() {};
    var prevented = 0;
    var data = {
        target: ee.element,
        srcEvent: {
            preventDefault: function() {
                prevented++;
            }
        }
    };

    ee.on('tap', fn);
    ee.off('tap', fn);
    strictEqual(ee.handlers.tap, undefined, 'removing last handler deletes empty bucket');

    var seenPreventDefault = null;
    ee.on('tap', function(ev) {
        seenPreventDefault = ev.preventDefault;
        ev.preventDefault();
    });
    ee.emit('tap', data);
    ee.emit('tap', data);

    strictEqual(data.preventDefault, seenPreventDefault, 'preventDefault wrapper reused across emits on same data object');
    equal(prevented, 2, 'preventDefault delegates to srcEvent on each call');

    ee.destroy();
});

test("Manager 'on', 'emit', and 'off' safely handle Object.prototype event names", function() {
    expect(3);

    var ee = new Hammer.Manager(utils.createHitArea());
    var calls = 0;
    var fn = function() {
        calls++;
    };
    var data = {
        target: ee.element,
        srcEvent: {preventDefault: function() {}}
    };

    ee.on('constructor', fn);
    ee.emit('constructor', data);
    equal(calls, 1, 'handler registered for "constructor" event fires cleanly');

    ee.emit('toString', data);
    ok(true, 'emitting unregistered "toString" event does not throw');

    ee.off('constructor', fn);
    ee.emit('constructor', data);
    equal(calls, 1, 'off("constructor", fn) unregisters handler cleanly');

    ee.destroy();
});
