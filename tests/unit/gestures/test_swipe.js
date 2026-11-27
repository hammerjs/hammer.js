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
        velocity: 0.9,
        velocityX: 0.1,
        velocityY: 0.9,
        srcEvent: {preventDefault: function() {}, target: el},
        target: el
    });
    equal(swipeCount, 0, 'horizontal swipe rejected when velocityX is below threshold');

    hammer.recognize({
        pointers: [{clientX: 120, clientY: 50}],
        changedPointers: [{clientX: 120, clientY: 50}],
        eventType: Hammer.INPUT_END,
        maxPointers: 1,
        distance: 70,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        velocity: 0.6,
        velocityX: 0.6,
        velocityY: 0,
        srcEvent: {preventDefault: function() {}, target: el},
        target: el
    });
    equal(swipeCount, 1, 'horizontal swipe accepted when velocityX exceeds threshold');

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
        velocity: 0.9,
        velocityX: 0.9,
        velocityY: 0.1,
        srcEvent: {preventDefault: function() {}, target: el},
        target: el
    });
    equal(swipeCount, 1, 'vertical swipe rejected when velocityY is below threshold');

    hammer.recognize({
        pointers: [{clientX: 50, clientY: 120}],
        changedPointers: [{clientX: 50, clientY: 120}],
        eventType: Hammer.INPUT_END,
        maxPointers: 1,
        distance: 70,
        offsetDirection: Hammer.DIRECTION_DOWN,
        velocity: 0.6,
        velocityX: 0,
        velocityY: 0.6,
        srcEvent: {preventDefault: function() {}, target: el},
        target: el
    });
    equal(swipeCount, 2, 'vertical swipe accepted when velocityY exceeds threshold');
});

test('weighted velocity tracker: constant speed, jitter smoothing, late flick, pause stop, peel-off, and 1-frame flick', function() {
    function feed(session, eventType, timeStamp, deltaX, deltaY) {
        var inp = {
            eventType: eventType,
            timeStamp: timeStamp,
            deltaX: deltaX,
            deltaY: deltaY
        };
        $H.computeIntervalInputData(session, inp);
        session.prevInput = inp;
        return inp;
    }

    // 1. Constant velocity (0.8 px/ms X, -0.4 px/ms Y) with uneven intervals -> exact slope
    var s1 = {};
    var times = [0, 8, 21, 33, 50, 66, 85, 100];
    var out;
    for (var i = 0; i < times.length; i++) {
        out = feed(s1, i === 0 ? Hammer.INPUT_START : Hammer.INPUT_MOVE, times[i], times[i] * 0.8, times[i] * -0.4);
    }
    ok(Math.abs(out.velocityX - 0.8) < 1e-6, 'exact velocityX (0.8 px/ms) on uneven intervals');
    ok(Math.abs(out.velocityY - (-0.4)) < 1e-6, 'exact velocityY (-0.4 px/ms) on uneven intervals');
    ok(Math.abs(out.velocity - 0.8) < 1e-6, 'dominant axis velocity matches velocityX');
    equal(out.direction, Hammer.DIRECTION_RIGHT, 'direction derived from weighted velocity');

    // 2. Liftoff peel-off shift on INPUT_END is ignored when >= 2 move samples exist
    out = feed(s1, Hammer.INPUT_END, 108, 72, -35);
    ok(Math.abs(out.velocityX - 0.8) < 1e-6, 'capacitive peel-off shift on INPUT_END does not corrupt release velocity');

    // 3. Pausing > 40ms before INPUT_END zeroes velocity cleanly (no phantom swipe after stop)
    var s2 = {};
    feed(s2, Hammer.INPUT_START, 0, 0, 0);
    feed(s2, Hammer.INPUT_MOVE, 10, 15, 0);
    feed(s2, Hammer.INPUT_MOVE, 20, 30, 0);
    out = feed(s2, Hammer.INPUT_END, 80, 30, 0);
    equal(out.velocityX, 0, 'velocityX resets to 0 when pointer pauses > 40ms before lift');
    equal(out.velocity, 0, 'velocity resets to 0 after pause');

    // 4. Slow drag followed by fast late flick (> 100ms total) reflects recent flick velocity
    var s3 = {};
    feed(s3, Hammer.INPUT_START, 0, 0, 0);
    feed(s3, Hammer.INPUT_MOVE, 20, 2, 0);
    feed(s3, Hammer.INPUT_MOVE, 40, 4, 0);
    feed(s3, Hammer.INPUT_MOVE, 60, 6, 0);
    feed(s3, Hammer.INPUT_MOVE, 80, 8, 0);
    feed(s3, Hammer.INPUT_MOVE, 100, 10, 0);
    feed(s3, Hammer.INPUT_MOVE, 120, 12, 0);
    feed(s3, Hammer.INPUT_MOVE, 130, 22, 0);
    feed(s3, Hammer.INPUT_MOVE, 140, 32, 0);
    feed(s3, Hammer.INPUT_MOVE, 150, 42, 0);
    out = feed(s3, Hammer.INPUT_END, 155, 42, 0);
    ok(out.velocityX > 0.5, 'recency-weighted LSQ1 captures late flick velocity (' + out.velocityX.toFixed(3) + ' px/ms)');

    // 5. Fast 1-frame flick (INPUT_START -> INPUT_END with no INPUT_MOVE) still computes velocity
    var s4 = {};
    feed(s4, Hammer.INPUT_START, 0, 0, 0);
    out = feed(s4, Hammer.INPUT_END, 20, 40, 0);
    ok(Math.abs(out.velocityX - 2.0) < 1e-6, '1-frame flick computes exact velocity');

    // 6. INPUT_CANCEL clears samples and zeroes velocity
    var s5 = {};
    feed(s5, Hammer.INPUT_START, 0, 0, 0);
    feed(s5, Hammer.INPUT_MOVE, 15, 30, 0);
    out = feed(s5, Hammer.INPUT_CANCEL, 25, 30, 0);
    equal(out.velocity, 0, 'INPUT_CANCEL zeroes velocity');
    equal(s5.velocitySamples.length, 0, 'INPUT_CANCEL clears velocity sample buffer');
});

test('SwipeRecognizer triggers on late flick and rejects drag-then-pause using weighted velocity', function() {
    expect(2);

    var swipe = new Hammer.Swipe({
        direction: Hammer.DIRECTION_HORIZONTAL,
        threshold: 10,
        velocity: 0.3
    });
    hammer.add(swipe);
    hammer.on('swiperight', function() {
        swipeCount++;
    });

    // Case 1: Slow drag then fast flick at the end (overallVelocityX = 0.25 < 0.3, weighted velocityX = 0.85 > 0.3)
    hammer.recognize({
        pointers: [{clientX: 100, clientY: 50}],
        changedPointers: [{clientX: 100, clientY: 50}],
        eventType: Hammer.INPUT_END,
        maxPointers: 1,
        distance: 50,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        overallVelocity: 0.25,
        overallVelocityX: 0.25,
        overallVelocityY: 0,
        velocity: 0.85,
        velocityX: 0.85,
        velocityY: 0,
        srcEvent: {preventDefault: function() {}, target: el},
        target: el
    });
    equal(swipeCount, 1, 'late flick triggers swipe even when overallVelocityX is below threshold');

    // Case 2: Fast drag followed by pause before lift (overallVelocityX = 0.8 > 0.3, weighted velocityX = 0)
    hammer.recognize({
        pointers: [{clientX: 150, clientY: 50}],
        changedPointers: [{clientX: 150, clientY: 50}],
        eventType: Hammer.INPUT_END,
        maxPointers: 1,
        distance: 100,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        overallVelocity: 0.8,
        overallVelocityX: 0.8,
        overallVelocityY: 0,
        velocity: 0,
        velocityX: 0,
        velocityY: 0,
        srcEvent: {preventDefault: function() {}, target: el},
        target: el
    });
    equal(swipeCount, 1, 'drag followed by pause before lift does not trigger swipe');
});

test('weighted velocity tracker incorporates coalesced PointerEvent sub-frame samples when supported', function() {
    var session = {};

    // Start at t=1000 (Date.now() clock domain, whereas DOMHighResTimeStamp is ~5000ms)
    var startInput = {
        eventType: Hammer.INPUT_START,
        timeStamp: 1000,
        deltaX: 0,
        deltaY: 0,
        pointers: [{clientX: 100, clientY: 100}],
        srcEvent: {timeStamp: 5000, clientX: 100, clientY: 100}
    };
    $H.computeIntervalInputData(session, startInput);
    session.prevInput = startInput;

    // Pause > 40ms, then a single 60Hz pointermove frame carries 3 coalesced sub-frame flick samples
    // moving at 2.0 px/ms (clientX: 100 -> 108 -> 116 over 5060 -> 5064 -> 5068)
    var coalescedEvents = [
        {timeStamp: 5060, clientX: 100, clientY: 100},
        {timeStamp: 5064, clientX: 108, clientY: 100},
        {timeStamp: 5068, clientX: 116, clientY: 100}
    ];
    var moveInput = {
        eventType: Hammer.INPUT_MOVE,
        timeStamp: 1068,
        deltaX: 16,
        deltaY: 0,
        pointers: [{clientX: 116, clientY: 100}],
        srcEvent: {
            timeStamp: 5068,
            clientX: 116,
            clientY: 100,
            getCoalescedEvents: function() {
                return coalescedEvents;
            }
        }
    };
    $H.computeIntervalInputData(session, moveInput);

    equal(session.velocitySamples.length, 3, 'all 3 sub-frame coalesced samples recorded after pause reset');
    ok(Math.abs(moveInput.velocityX - 2.0) < 1e-6, 'exact 2.0 px/ms flick velocity recovered from coalesced events');

    // Out-of-order coalesced sample (e.g. 1ms Date.now rounding before last sample) does not wipe buffer
    var moveInput2 = {
        eventType: Hammer.INPUT_MOVE,
        timeStamp: 1076,
        deltaX: 32,
        deltaY: 0,
        pointers: [{clientX: 132, clientY: 100}],
        srcEvent: {
            timeStamp: 5076,
            clientX: 132,
            clientY: 100,
            getCoalescedEvents: function() {
                return [
                    {timeStamp: 5067, clientX: 114, clientY: 100}, // maps to 1067 <= 1068, must be skipped
                    {timeStamp: 5072, clientX: 124, clientY: 100},
                    {timeStamp: 5076, clientX: 132, clientY: 100}
                ];
            }
        }
    };
    $H.computeIntervalInputData(session, moveInput2);

    equal(session.velocitySamples.length, 5, 'older coalesced sample skipped without wiping prior samples');
    ok(Math.abs(moveInput2.velocityX - 2.0) < 1e-6, 'velocity remains exact across frames with coalesced events');

    // Multi-pointer coalesced move scales delta by 1 / pointers.length (centroid velocity)
    var multiSession = {};
    var mStart = {
        eventType: Hammer.INPUT_START,
        timeStamp: 2000,
        deltaX: 0,
        deltaY: 0,
        pointers: [{clientX: 0, clientY: 0}, {clientX: 100, clientY: 0}],
        srcEvent: {timeStamp: 6000, clientX: 0, clientY: 0}
    };
    $H.computeIntervalInputData(multiSession, mStart);
    var mMove = {
        eventType: Hammer.INPUT_MOVE,
        timeStamp: 2010,
        deltaX: 10, // single pointer moved +20px -> 2-pointer centroid moved +10px
        deltaY: 0,
        pointers: [{clientX: 20, clientY: 0}, {clientX: 100, clientY: 0}],
        srcEvent: {
            timeStamp: 6010,
            clientX: 20,
            clientY: 0,
            getCoalescedEvents: function() {
                return [
                    {timeStamp: 6005, clientX: 10, clientY: 0},
                    {timeStamp: 6010, clientX: 20, clientY: 0}
                ];
            }
        }
    };
    $H.computeIntervalInputData(multiSession, mMove);
    ok(Math.abs(mMove.velocityX - 1.0) < 1e-6, '2-pointer coalesced centroid velocity is 1.0 px/ms');
});

test('1000Hz coalesced PointerEvents preserve full 100ms velocity horizon and skip malformed entries', function() {
    var session = {};
    var t0 = 3000;
    var domT0 = 7000;

    $H.computeIntervalInputData(session, {
        eventType: Hammer.INPUT_START,
        timeStamp: t0,
        deltaX: 0,
        deltaY: 0,
        pointers: [{clientX: 0, clientY: 0}],
        srcEvent: {timeStamp: domT0, clientX: 0, clientY: 0}
    });

    // 5 frames at 60Hz (80ms total), each carrying 16 coalesced 1000Hz (1ms) samples at (1.5, -0.5) px/ms
    var out;
    for (var frame = 1; frame <= 5; frame++) {
        var frameEnd = frame * 16;
        var coalesced = [];
        for (var dt = (frame - 1) * 16 + 1; dt <= frameEnd; dt++) {
            coalesced.push({
                timeStamp: domT0 + dt,
                clientX: dt * 1.5,
                clientY: dt * -0.5
            });
        }
        // inject a malformed entry (missing clientX) on frame 3 to verify NaN-safe skipping
        if (frame === 3) {
            coalesced.splice(4, 0, {timeStamp: domT0 + frameEnd - 8});
        }
        out = {
            eventType: Hammer.INPUT_MOVE,
            timeStamp: t0 + frameEnd,
            deltaX: frameEnd * 1.5,
            deltaY: frameEnd * -0.5,
            pointers: [{clientX: frameEnd * 1.5, clientY: frameEnd * -0.5}],
            srcEvent: {
                timeStamp: domT0 + frameEnd,
                clientX: frameEnd * 1.5,
                clientY: frameEnd * -0.5,
                getCoalescedEvents: function() {
                    return coalesced;
                }
            }
        };
        $H.computeIntervalInputData(session, out);
    }

    var samples = session.velocitySamples;
    var span = samples[samples.length - 1].t - samples[0].t;
    ok(span >= 70, '1000Hz coalesced input preserves full window span instead of overflowing in 20ms (span=' + span + 'ms)');
    ok(Math.abs(out.velocityX - 1.5) < 1e-6, 'exact 1.5 px/ms velocityX preserved under 1000Hz decimation');
    ok(Math.abs(out.velocityY - (-0.5)) < 1e-6, 'exact -0.5 px/ms velocityY preserved under 1000Hz decimation');
});

test('velocity tracker uses hardware srcEvent.timeStamp so main-thread frame jitter does not skew velocity', function() {
    var session = {};

    // Hardware moves at constant 1.0 px/ms (5000 -> 5016 -> 5032 -> 5048),
    // but frame 2 is delayed 10ms on the main thread (Date.now() = 1042 instead of 1032)
    $H.computeIntervalInputData(session, {
        eventType: Hammer.INPUT_START,
        timeStamp: 1000,
        deltaX: 0,
        deltaY: 0,
        pointers: [{clientX: 0, clientY: 0}],
        srcEvent: {timeStamp: 5000, clientX: 0, clientY: 0}
    });

    $H.computeIntervalInputData(session, {
        eventType: Hammer.INPUT_MOVE,
        timeStamp: 1016,
        deltaX: 16,
        deltaY: 0,
        pointers: [{clientX: 16, clientY: 0}],
        srcEvent: {
            timeStamp: 5016,
            clientX: 16,
            clientY: 0,
            getCoalescedEvents: function() {
                return [
                    {timeStamp: 5004, clientX: 4, clientY: 0},
                    {timeStamp: 5008, clientX: 8, clientY: 0},
                    {timeStamp: 5012, clientX: 12, clientY: 0},
                    {timeStamp: 5016, clientX: 16, clientY: 0}
                ];
            }
        }
    });

    // Frame 2 delayed 10ms on main thread (input.timeStamp=1042 vs hardware 5032)
    $H.computeIntervalInputData(session, {
        eventType: Hammer.INPUT_MOVE,
        timeStamp: 1042,
        deltaX: 32,
        deltaY: 0,
        pointers: [{clientX: 32, clientY: 0}],
        srcEvent: {
            timeStamp: 5032,
            clientX: 32,
            clientY: 0,
            getCoalescedEvents: function() {
                return [
                    {timeStamp: 5020, clientX: 20, clientY: 0},
                    {timeStamp: 5024, clientX: 24, clientY: 0},
                    {timeStamp: 5028, clientX: 28, clientY: 0},
                    {timeStamp: 5032, clientX: 32, clientY: 0}
                ];
            }
        }
    });

    // Frame 3 arrives on time (input.timeStamp=1048, hardware 5048)
    var frame3 = {
        eventType: Hammer.INPUT_MOVE,
        timeStamp: 1048,
        deltaX: 48,
        deltaY: 0,
        pointers: [{clientX: 48, clientY: 0}],
        srcEvent: {
            timeStamp: 5048,
            clientX: 48,
            clientY: 0,
            getCoalescedEvents: function() {
                return [
                    {timeStamp: 5036, clientX: 36, clientY: 0},
                    {timeStamp: 5040, clientX: 40, clientY: 0},
                    {timeStamp: 5044, clientX: 44, clientY: 0},
                    {timeStamp: 5048, clientX: 48, clientY: 0}
                ];
            }
        }
    };
    $H.computeIntervalInputData(session, frame3);

    ok(Math.abs(frame3.velocityX - 1.0) < 1e-6, 'main-thread stall does not spike velocity (' + frame3.velocityX.toFixed(3) + ' px/ms)');
});

test('SwipeRecognizer rejects reverse flick opposing offsetDirection', function() {
    expect(2);

    var events = [];
    hammer.add(new Hammer.Swipe({
        direction: Hammer.DIRECTION_HORIZONTAL,
        threshold: 10,
        velocity: 0.3
    }));
    hammer.on('swipeleft swiperight', function(ev) {
        events.push(ev.type);
    });

    // Dragged right +100px then flicked back left -40px (ends at +60px: offsetDirection=RIGHT, direction=LEFT)
    hammer.recognize({
        pointers: [{clientX: 110, clientY: 50}],
        changedPointers: [{clientX: 110, clientY: 50}],
        eventType: Hammer.INPUT_END,
        maxPointers: 1,
        distance: 60,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        direction: Hammer.DIRECTION_LEFT,
        velocity: -1.2,
        velocityX: -1.2,
        velocityY: 0,
        srcEvent: {preventDefault: function() {}, target: el},
        target: el
    });
    deepEqual(events, [], 'reverse leftward flick does not falsely emit swiperight');

    // Dragged right and flicked right -> emits swiperight
    hammer.recognize({
        pointers: [{clientX: 140, clientY: 50}],
        changedPointers: [{clientX: 140, clientY: 50}],
        eventType: Hammer.INPUT_END,
        maxPointers: 1,
        distance: 90,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        direction: Hammer.DIRECTION_RIGHT,
        velocity: 1.2,
        velocityX: 1.2,
        velocityY: 0,
        srcEvent: {preventDefault: function() {}, target: el},
        target: el
    });
    deepEqual(events, ['swiperight'], 'matching rightward flick still emits swiperight');
});

test('SwipeRecognizer accepts curved/diagonal swipes moving in offsetDirection and rejects cross-axis velocity', function() {
    expect(3);

    var events = [];
    hammer.add(new Hammer.Swipe({
        direction: Hammer.DIRECTION_HORIZONTAL,
        threshold: 10,
        velocity: 0.3
    }));
    hammer.on('swipeleft swiperight swipeup swipedown', function(ev) {
        events.push(ev.type);
    });

    // Curved rightward thumb swipe arcing slightly down near liftoff (vx=0.80, vy=0.85 -> direction=DOWN, offsetDirection=RIGHT)
    hammer.recognize({
        pointers: [{clientX: 142, clientY: 84}],
        changedPointers: [{clientX: 142, clientY: 84}],
        eventType: Hammer.INPUT_END,
        maxPointers: 1,
        distance: 98,
        deltaX: 92,
        deltaY: 34,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        direction: Hammer.DIRECTION_DOWN,
        velocity: 0.85,
        velocityX: 0.80,
        velocityY: 0.85,
        srcEvent: {preventDefault: function() {}, target: el},
        target: el
    });
    deepEqual(events, ['swiperight'], 'curved horizontal swipe arcing downward still emits swiperight');

    // Diagonal swipe under DIRECTION_ALL
    events = [];
    hammer.add(new Hammer.Swipe({
        direction: Hammer.DIRECTION_ALL,
        threshold: 10,
        velocity: 0.3
    }));
    hammer.recognize({
        pointers: [{clientX: 142, clientY: 84}],
        changedPointers: [{clientX: 142, clientY: 84}],
        eventType: Hammer.INPUT_END,
        maxPointers: 1,
        distance: 98,
        deltaX: 92,
        deltaY: 34,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        direction: Hammer.DIRECTION_DOWN,
        velocity: 0.85,
        velocityX: 0.80,
        velocityY: 0.85,
        srcEvent: {preventDefault: function() {}, target: el},
        target: el
    });
    deepEqual(events, ['swiperight'], 'diagonal swipe under DIRECTION_ALL emits swiperight when velocityX exceeds threshold');

    // Vertical velocity alone must not trigger swiperight under DIRECTION_ALL
    events = [];
    hammer.recognize({
        pointers: [{clientX: 142, clientY: 84}],
        changedPointers: [{clientX: 142, clientY: 84}],
        eventType: Hammer.INPUT_END,
        maxPointers: 1,
        distance: 98,
        deltaX: 92,
        deltaY: 34,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        direction: Hammer.DIRECTION_DOWN,
        velocity: 0.90,
        velocityX: 0.10,
        velocityY: 0.90,
        srcEvent: {preventDefault: function() {}, target: el},
        target: el
    });
    deepEqual(events, [], 'vertical velocity below velocityX threshold does not trigger swiperight under DIRECTION_ALL');
});
