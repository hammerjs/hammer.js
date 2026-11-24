var el,
    hammer,
    swipeCount = 0;

module('Swipe Gesture', {
    setup: function() {
        el = utils.createHitArea();
        hammer = new Hammer(el, {recognizers: []});
        swipeCount = 0;
    },
    teardown: function() {
        hammer.destroy();
    }
});

test('swipe can be recognized', function() {
    expect(1);

    var swipe = new Hammer.Swipe({threshold: 1});
    hammer.add(swipe);
    hammer.on('swipe', function() {
        ok(true);
        start();
    });

    stop();

    Simulator.gestures.swipe(el);
});

test('single-axis swipe checks velocity along configured axis', function() {
    expect(4);

    var swipeH = new Hammer.Swipe({
        direction: Hammer.DIRECTION_HORIZONTAL,
        threshold: 10,
        velocity: 0.3
    });
    hammer.add(swipeH);
    hammer.on('swipe', function() {
        swipeCount++;
    });

    hammer.recognize({
        pointers: [{clientX: 70, clientY: 50}],
        changedPointers: [{clientX: 70, clientY: 50}],
        eventType: Hammer.INPUT_END,
        maxPointers: 1,
        distance: 20,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        overallVelocity: 0.9,
        overallVelocityX: 0.1,
        overallVelocityY: 0.9,
        srcEvent: {preventDefault: function() {}, target: el},
        target: el
    });
    equal(swipeCount, 0, 'horizontal swipe rejected when overallVelocityX is below threshold');

    hammer.recognize({
        pointers: [{clientX: 120, clientY: 50}],
        changedPointers: [{clientX: 120, clientY: 50}],
        eventType: Hammer.INPUT_END,
        maxPointers: 1,
        distance: 70,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        overallVelocity: 0.6,
        overallVelocityX: 0.6,
        overallVelocityY: 0,
        srcEvent: {preventDefault: function() {}, target: el},
        target: el
    });
    equal(swipeCount, 1, 'horizontal swipe accepted when overallVelocityX exceeds threshold');

    hammer.add(new Hammer.Swipe({
        direction: Hammer.DIRECTION_VERTICAL,
        threshold: 10,
        velocity: 0.3
    }));

    hammer.recognize({
        pointers: [{clientX: 50, clientY: 70}],
        changedPointers: [{clientX: 50, clientY: 70}],
        eventType: Hammer.INPUT_END,
        maxPointers: 1,
        distance: 20,
        offsetDirection: Hammer.DIRECTION_DOWN,
        overallVelocity: 0.9,
        overallVelocityX: 0.9,
        overallVelocityY: 0.1,
        srcEvent: {preventDefault: function() {}, target: el},
        target: el
    });
    equal(swipeCount, 1, 'vertical swipe rejected when overallVelocityY is below threshold');

    hammer.recognize({
        pointers: [{clientX: 50, clientY: 120}],
        changedPointers: [{clientX: 50, clientY: 120}],
        eventType: Hammer.INPUT_END,
        maxPointers: 1,
        distance: 70,
        offsetDirection: Hammer.DIRECTION_DOWN,
        overallVelocity: 0.6,
        overallVelocityX: 0,
        overallVelocityY: 0.6,
        srcEvent: {preventDefault: function() {}, target: el},
        target: el
    });
    equal(swipeCount, 2, 'vertical swipe accepted when overallVelocityY exceeds threshold');
});
