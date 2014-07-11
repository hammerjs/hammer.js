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

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'move', 60, 50);
    utils.dispatchTouchEvent(el, 'move', 70, 50);
    utils.dispatchTouchEvent(el, 'end', 70, 50);
});
