var el,
    hammer;

QUnit.module('Pan Gesture', {
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

QUnit.test('`panstart` and `panmove` should be recognized', function(assert) {
    assert.expect(2);

    var panMoveCount = 0;
    var pan = new Hammer.Pan({threshold: 1});

    hammer.add(pan);
    hammer.on('panstart', function() {
      assert.ok(true);
    });
    hammer.on('panmove', function() {
      panMoveCount++;
    });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'move', 70, 50);
    utils.dispatchTouchEvent(el, 'move', 90, 50);

    assert.equal(panMoveCount, 1);
});

QUnit.test('Pan event flow should be start -> left -> end', function(assert) {
    var done = assert.async();
    assert.expect(1);
    var pan = new Hammer.Pan({threshold: 1});
    hammer.add(pan);

    var eventflow = '';
    var isCalledPanleft = false;
    hammer.on('panstart', function() {
        eventflow += 'start';
    });
    hammer.on('panleft', function() {
        if(!isCalledPanleft){
            isCalledPanleft = true;
            eventflow += 'left';
        }
    });
    hammer.on('panend', function() {
        eventflow += 'end';
        isCalledPanleft = true;
    });

    Simulator.gestures.pan(el, { duration: 60, deltaX: -100, deltaY: 0 }, function() {
        assert.equal(eventflow, 'startleftend');
        done();
    });
});

QUnit.test('calling manager.stop() inside panstart does not skip panstart on the next gesture', function(assert) {
    assert.expect(2);

    var pan = new Hammer.Pan({threshold: 5});
    hammer.add(pan);

    var events = [];
    var shouldStop = true;

    hammer.on('panstart panmove panend', function(ev) {
        events.push(ev.type);
        if (ev.type === 'panstart' && shouldStop) {
            hammer.stop();
        }
    });

    // Gesture 1: triggers panstart and stops the session mid-gesture
    utils.dispatchTouchEvent(el, 'start', 10, 10);
    utils.dispatchTouchEvent(el, 'move', 30, 10);
    utils.dispatchTouchEvent(el, 'move', 50, 10);
    utils.dispatchTouchEvent(el, 'end', 50, 10);
    assert.deepEqual(events, ['panstart'], 'first gesture stops after panstart');

    // Gesture 2: fresh session must reset recognizer state and emit panstart again
    events = [];
    shouldStop = false;
    utils.dispatchTouchEvent(el, 'start', 10, 10);
    utils.dispatchTouchEvent(el, 'move', 30, 10);
    utils.dispatchTouchEvent(el, 'end', 30, 10);
    assert.deepEqual(events, ['panstart', 'panend'], 'next gesture after stop() properly emits panstart');
});

QUnit.test('PanRecognizer with DIRECTION_NONE does not recognize pans', function(assert) {
    assert.expect(1);

    var panCount = 0;
    var pan = new Hammer.Pan({direction: Hammer.DIRECTION_NONE, threshold: 5});
    hammer.add(pan);
    hammer.on('pan panstart panmove panend', function() {
        panCount++;
    });

    // Synchronous moves have input.direction === DIRECTION_NONE within COMPUTE_INTERVAL
    utils.dispatchTouchEvent(el, 'start', 10, 10);
    utils.dispatchTouchEvent(el, 'move', 40, 10);
    utils.dispatchTouchEvent(el, 'move', 40, 40);
    utils.dispatchTouchEvent(el, 'end', 40, 40);

    assert.equal(panCount, 0, 'no pan events fired when direction is DIRECTION_NONE');
});

QUnit.test('consecutive axis-locked pans at the same deltaX both recognize cleanly', function(assert) {
    assert.expect(2);

    var pan = new Hammer.Pan({direction: Hammer.DIRECTION_HORIZONTAL, threshold: 5});
    hammer.add(pan);

    var panStarts = 0;
    hammer.on('panstart', function() {
        panStarts++;
    });

    // Gesture 1 ends with deltaX = 30
    utils.dispatchTouchEvent(el, 'start', 10, 10);
    utils.dispatchTouchEvent(el, 'move', 40, 10);
    utils.dispatchTouchEvent(el, 'end', 40, 10);
    assert.equal(panStarts, 1, 'first pan recognized');

    // Gesture 2 arrives directly at deltaX = 30 with predominantly vertical direction (triggers axis lock check)
    pan.recognize({
        eventType: $H.INPUT_MOVE,
        pointers: [{}],
        distance: 50,
        deltaX: 30,
        deltaY: 40,
        direction: Hammer.DIRECTION_DOWN,
        srcEvent: {cancelable: true, preventDefault: function() {}}
    });
    assert.equal(panStarts, 2, 'second axis-locked pan at same deltaX recognizes cleanly');
});

QUnit.test('single-axis Pan checks axis displacement against threshold and ignores perpendicular wiggle', function(assert) {
    assert.expect(4);

    // 1. Horizontal-only Pan must not start on 25px vertical drag + 1px horizontal wiggle
    var hEvents = [];
    var hPan = new Hammer.Pan({direction: Hammer.DIRECTION_HORIZONTAL, threshold: 10});
    hammer.add(hPan);
    hammer.on('panstart', function(ev) {
        hEvents.push(ev.type);
    });

    hPan.recognize({
        eventType: $H.INPUT_MOVE,
        pointers: [{}],
        distance: 25,
        deltaX: 1,
        deltaY: 25,
        direction: Hammer.DIRECTION_RIGHT,
        srcEvent: {cancelable: true, preventDefault: function() {}}
    });
    assert.deepEqual(hEvents, [], 'horizontal Pan rejects 1px horizontal wiggle after 25px vertical drag');

    hPan.recognize({
        eventType: $H.INPUT_MOVE,
        pointers: [{}],
        distance: 28,
        deltaX: 12,
        deltaY: 25,
        direction: Hammer.DIRECTION_RIGHT,
        srcEvent: {cancelable: true, preventDefault: function() {}}
    });
    assert.deepEqual(hEvents, ['panstart'], 'horizontal Pan starts once abs(deltaX) exceeds threshold');

    // 2. Vertical-only Pan must not start on 25px horizontal drag + 1px vertical wiggle
    var vEvents = [];
    hammer.off('panstart');
    var vPan = new Hammer.Pan({direction: Hammer.DIRECTION_VERTICAL, threshold: 10});
    hammer.add(vPan);
    hammer.on('panstart', function(ev) {
        vEvents.push(ev.type);
    });

    vPan.recognize({
        eventType: $H.INPUT_MOVE,
        pointers: [{}],
        distance: 25,
        deltaX: 25,
        deltaY: 1,
        direction: Hammer.DIRECTION_DOWN,
        srcEvent: {cancelable: true, preventDefault: function() {}}
    });
    assert.deepEqual(vEvents, [], 'vertical Pan rejects 1px vertical wiggle after 25px horizontal drag');

    vPan.recognize({
        eventType: $H.INPUT_MOVE,
        pointers: [{}],
        distance: 28,
        deltaX: 25,
        deltaY: 12,
        direction: Hammer.DIRECTION_DOWN,
        srcEvent: {cancelable: true, preventDefault: function() {}}
    });
    assert.deepEqual(vEvents, ['panstart'], 'vertical Pan starts once abs(deltaY) exceeds threshold');
});

QUnit.test('slow drags (>40ms between moves) recognize vertical Pan(DIRECTION_ALL) and keep emitting directional pan events', function(assert) {
    assert.expect(3);

    // 1. Slow vertical drag (>40ms between moves) with DIRECTION_ALL
    var panAll = new Hammer.Pan({direction: Hammer.DIRECTION_ALL, threshold: 10});
    hammer.add(panAll);

    var verticalEvents = [];
    hammer.on('panstart panmove pandown panend', function(ev) {
        verticalEvents.push(ev.type);
    });

    function feedPointer(type, x, y, t) {
        var ptr = {clientX: x, clientY: y};
        $H.inputHandler(hammer, type, {
            pointers: [ptr],
            changedPointers: [ptr],
            pointerType: 'touch',
            srcEvent: {timeStamp: t, target: el, cancelable: true, preventDefault: function() {}}
        });
    }

    feedPointer($H.INPUT_START, 10, 10, 1000);
    feedPointer($H.INPUT_MOVE, 10, 25, 1050);
    feedPointer($H.INPUT_MOVE, 10, 40, 1100);
    feedPointer($H.INPUT_END, 10, 40, 1150);

    assert.deepEqual(
        verticalEvents,
        ['panstart', 'pandown', 'panmove', 'pandown', 'panend'],
        'slow vertical drag with DIRECTION_ALL emits panstart, panmove, pandown, and panend'
    );

    // 2. Slow horizontal drag (>40ms between moves) keeps emitting panright on every panmove
    hammer.off('panstart panmove pandown panend');
    hammer.add(new Hammer.Pan({direction: Hammer.DIRECTION_HORIZONTAL, threshold: 10}));

    var panRightCount = 0;
    hammer.on('panright', function() {
        panRightCount++;
    });

    feedPointer($H.INPUT_START, 10, 10, 2000);
    feedPointer($H.INPUT_MOVE, 25, 10, 2050);
    feedPointer($H.INPUT_MOVE, 40, 10, 2100);
    feedPointer($H.INPUT_MOVE, 55, 10, 2150);
    feedPointer($H.INPUT_MOVE, 70, 10, 2200);
    feedPointer($H.INPUT_END, 70, 10, 2250);

    assert.equal(panRightCount, 4, 'panright emitted on panstart and every subsequent slow panmove');

    // 3. Direct DIRECTION_ALL pan recognition when input.direction is DIRECTION_NONE
    var directStarts = 0;
    hammer.off('panright');
    hammer.add(new Hammer.Pan({direction: Hammer.DIRECTION_ALL, threshold: 10}));
    hammer.on('panstart', function() {
        directStarts++;
    });
    hammer.get('pan').recognize({
        eventType: $H.INPUT_MOVE,
        pointers: [{}],
        distance: 20,
        deltaX: 0,
        deltaY: 20,
        direction: Hammer.DIRECTION_NONE,
        srcEvent: {cancelable: true, preventDefault: function() {}}
    });
    assert.equal(directStarts, 1, 'DIRECTION_ALL recognizes vertical displacement when input.direction is DIRECTION_NONE');
});

QUnit.test('directional Pan rejects 1px opposite wiggle after dragging in disallowed direction', function(assert) {
    assert.expect(5);

    var events = [];
    hammer.add(new Hammer.Pan({direction: Hammer.DIRECTION_RIGHT, threshold: 10}));
    hammer.on('panstart panright', function(ev) {
        events.push(ev.type);
    });

    // Drag -29px left, then 1px wiggle right (instantaneous direction === DIRECTION_RIGHT, cumulative deltaX === -29)
    hammer.get('pan').recognize({
        eventType: $H.INPUT_MOVE,
        pointers: [{}],
        distance: 29,
        deltaX: -29,
        deltaY: 0,
        direction: Hammer.DIRECTION_RIGHT,
        srcEvent: {cancelable: true, preventDefault: function() {}}
    });
    assert.deepEqual(events, [], 'DIRECTION_RIGHT rejects 1px rightward wiggle while cumulative deltaX is -29');

    hammer.get('pan').recognize({
        eventType: $H.INPUT_MOVE,
        pointers: [{}],
        distance: 15,
        deltaX: 15,
        deltaY: 0,
        direction: Hammer.DIRECTION_LEFT,
        srcEvent: {cancelable: true, preventDefault: function() {}}
    });
    assert.deepEqual(events, ['panstart', 'panright'], 'DIRECTION_RIGHT recognizes when cumulative deltaX > threshold');

    // Vertical single-direction: DIRECTION_UP rejects +29px down with 1px upward wiggle
    events = [];
    hammer.off('panstart panright');
    hammer.add(new Hammer.Pan({direction: Hammer.DIRECTION_UP, threshold: 10}));
    hammer.on('panstart panup', function(ev) {
        events.push(ev.type);
    });
    hammer.get('pan').recognize({
        eventType: $H.INPUT_MOVE,
        pointers: [{}],
        distance: 29,
        deltaX: 0,
        deltaY: 29,
        direction: Hammer.DIRECTION_UP,
        srcEvent: {cancelable: true, preventDefault: function() {}}
    });
    assert.deepEqual(events, [], 'DIRECTION_UP rejects 1px upward wiggle while cumulative deltaY is +29');

    // Asymmetric multi-axis mask (RIGHT | DOWN) uses cumulative getDirection(x, y)
    events = [];
    hammer.off('panstart panup');
    hammer.add(new Hammer.Pan({direction: Hammer.DIRECTION_RIGHT | Hammer.DIRECTION_DOWN, threshold: 10}));
    hammer.on('panstart panright pandown', function(ev) {
        events.push(ev.type);
    });
    hammer.get('pan').recognize({
        eventType: $H.INPUT_MOVE,
        pointers: [{}],
        distance: 29,
        deltaX: -29,
        deltaY: 0,
        direction: Hammer.DIRECTION_RIGHT,
        srcEvent: {cancelable: true, preventDefault: function() {}}
    });
    assert.deepEqual(events, [], 'asymmetric RIGHT|DOWN mask rejects 1px right wiggle at deltaX = -29');

    hammer.get('pan').recognize({
        eventType: $H.INPUT_MOVE,
        pointers: [{}],
        distance: 20,
        deltaX: 0,
        deltaY: 20,
        direction: Hammer.DIRECTION_DOWN,
        srcEvent: {cancelable: true, preventDefault: function() {}}
    });
    assert.deepEqual(events, ['panstart', 'pandown'], 'asymmetric RIGHT|DOWN mask recognizes downward drag');
});
