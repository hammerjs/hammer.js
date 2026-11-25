var el,
    hammer;

module('Pan Gesture', {
    setup: function() {
        el = document.createElement('div');
        document.body.appendChild(el);

        hammer = new Hammer(el, {recognizers: []});
    },
    teardown: function() {
        document.body.removeChild(el);
        hammer.destroy();
    }
});

test('`panstart` and `panmove` should be recognized', function() {
    expect(2);

    var panMoveCount = 0;
    var pan = new Hammer.Pan({threshold: 1});

    hammer.add(pan);
    hammer.on('panstart', function() {
      ok(true);
    });
    hammer.on('panmove', function() {
      panMoveCount++;
    });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'move', 70, 50);
    utils.dispatchTouchEvent(el, 'move', 90, 50);

    equal(panMoveCount, 1);
});

asyncTest('Pan event flow should be start -> left -> end', function() {
    expect(1);
    var pan = new Hammer.Pan({threshold: 1});
    hammer.add(pan);

    var eventflow = "";
    var isCalledPanleft = false;
    hammer.on('panstart', function() {
        eventflow += "start";
    });
    hammer.on('panleft', function() {
        if(!isCalledPanleft){
            isCalledPanleft = true;
            eventflow += "left";
        }
    });
    hammer.on('panend', function() {
        eventflow += "end";
        isCalledPanleft = true;
    });

    Simulator.gestures.pan(el, { deltaX: -100, deltaY: 0 }, function() {
        equal(eventflow,"startleftend");
        start();
    });
});

test('calling manager.stop() inside panstart does not skip panstart on the next gesture', function() {
    expect(2);

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
    deepEqual(events, ['panstart'], 'first gesture stops after panstart');

    // Gesture 2: fresh session must reset recognizer state and emit panstart again
    events = [];
    shouldStop = false;
    utils.dispatchTouchEvent(el, 'start', 10, 10);
    utils.dispatchTouchEvent(el, 'move', 30, 10);
    utils.dispatchTouchEvent(el, 'end', 30, 10);
    deepEqual(events, ['panstart', 'panend'], 'next gesture after stop() properly emits panstart');
});

test('PanRecognizer with DIRECTION_NONE does not recognize pans', function() {
    expect(1);

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

    equal(panCount, 0, 'no pan events fired when direction is DIRECTION_NONE');
});
