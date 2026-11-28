var el,
    hammer;

QUnit.module('Pinch Gesture', {
    beforeEach: function() {
        el = document.createElement('div');
        document.body.appendChild(el);

        hammer = new Hammer(el, {recognizers: []});
    },
    afterEach: function() {
        document.body.removeChild(el);
        hammer.destroy();
    }
});

QUnit.test('Pinch event flow should be start -> in -> end', function(assert) {
    var done = assert.async();
    assert.expect(1);
    var pinch = new Hammer.Pinch({enable: true, threshold: .1});
    hammer.add(pinch);

    var eventflow = '';
    var isFiredPinchin = false;
    hammer.on('pinchstart', function() {
        eventflow += 'start';
    });
    hammer.on('pinchin', function() {
        if(!isFiredPinchin){
            isFiredPinchin = true;
            eventflow += 'in';
        }
    });
    hammer.on('pinchend', function() {
        eventflow += 'end';
        isFiredPinchin = false;
    });

    Simulator.gestures.pinch(el, { duration: 80, scale: .5 }, function() {
        assert.equal(eventflow, 'startinend');
        done();
    });
});

QUnit.test('getScale returns 1 instead of NaN or Infinity when initial pointers overlap', function(assert) {
    assert.expect(3);

    var overlapping = [{clientX: 50, clientY: 50}, {clientX: 50, clientY: 50}];
    var spread = [{clientX: 20, clientY: 50}, {clientX: 80, clientY: 50}];

    assert.strictEqual($H.getScale(overlapping, overlapping), 1, 'identical overlapping pointers return scale 1 (not NaN)');
    assert.strictEqual($H.getScale(overlapping, spread), 1, 'moving apart from zero initial distance returns scale 1 (not Infinity)');
    assert.strictEqual(
        $H.getScale([{clientX: 0, clientY: 0}, {clientX: 10, clientY: 0}], [{clientX: 0, clientY: 0}, {clientX: 20, clientY: 0}]),
        2,
        'normal scale calculation preserved'
    );
});

QUnit.test('cancelling 1-finger Pan on 2nd pointer releases curRecognizer so Pinch can recognize', function(assert) {
    assert.expect(2);

    hammer.add(new Hammer.Pan({threshold: 5}));
    hammer.add(new Hammer.Pinch({enable: true, threshold: 0.1}));

    var events = [];
    hammer.on('panstart pancancel pinchstart pinchout pinchend', function(ev) {
        events.push(ev.type);
    });

    var p1Start = {clientX: 10, clientY: 10};
    var p1Moved = {clientX: 30, clientY: 10};
    var p2Start = {clientX: 50, clientY: 10};
    var p2Spread = {clientX: 90, clientY: 10};

    function feed(type, pointers, changed, t) {
        $H.inputHandler(hammer, type, {
            pointers: pointers,
            changedPointers: changed,
            pointerType: 'touch',
            srcEvent: {target: el, timeStamp: t, cancelable: true, preventDefault: function() {}}
        });
    }

    // 1-finger pan starts
    feed($H.INPUT_START, [p1Start], [p1Start], 10);
    feed($H.INPUT_MOVE, [p1Moved], [p1Moved], 20);
    // 2nd finger lands -> cancels Pan
    feed($H.INPUT_START, [p1Moved, p2Start], [p2Start], 30);
    // Spread fingers apart -> Pinch should recognize
    feed($H.INPUT_MOVE, [p1Moved, p2Spread], [p2Spread], 40);
    feed($H.INPUT_END, [p1Moved, p2Spread], [p1Moved, p2Spread], 50);

    assert.deepEqual(
        events,
        ['panstart', 'pancancel', 'pinchstart', 'pinchout', 'pinchout', 'pinchend'],
        'Pinch recognizes cleanly after 1-finger Pan transitions to STATE_CANCELLED'
    );
    assert.equal(hammer.session.curRecognizer.options.event, 'pinch', 'curRecognizer transitions to pinch');
});

