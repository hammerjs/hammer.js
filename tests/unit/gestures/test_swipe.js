var el,
    hammer,
    swipeCount = 0;


module('Swipe Gesture', {
    setup: function() {
        el = document.createElement('div');
        document.body.appendChild(el);

        hammer = new Hammer(el, {recognizers: []});


        swipeCount = 0;
    },
    teardown: function() {
        document.body.removeChild(el);
        hammer.destroy();
    }
});

test('swipe can be recognized', function() {

    expect(1);

    var swipe = new Hammer.Swipe({threshold: 1});

    hammer.add(swipe);

    hammer.on('swipe', function() {
        swipeCount++;
    });

    testUtils.dispatchTouchEvent(el, 'start', 50, 50);
    testUtils.dispatchTouchEvent(el, 'move', 60, 50);

    equal(swipeCount, 1, 'swipe is recognized');
});
