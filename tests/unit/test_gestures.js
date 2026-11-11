// jscs:disable requireArrowFunctions,disallowVar,requireEnhancedObjectLiterals
/* globals QUnit,Hammer,utils,Simulator */

// TODO: this tests fails because tapRecognizer changes
// it could be that tapRecognizer setup its BEGAN state and
// disable the other gesture recognition
var el;
var hammer;
var events;
var allGestureEvents = [
    'tap doubletap press',
    'pinch pinchin pinchout pinchstart pinchmove pinchend pinchcancel',
    'rotate rotatestart rotatemove rotateend rotatecancel',
    'pan panstart panmove panup pandown panleft panright panend pancancel',
    'swipe swipeleft swiperight swipeup swipedown'
].join(' ');

QUnit.module('Gesture recognition', {
    beforeEach: function() {
        el = utils.createHitArea();
        hammer = new Hammer(el);
        hammer.get('pinch')
            .set({ // Some threshold, since the simulator doesnt stays at scale:1 when rotating
                enable: true,
                threshold: 0.1
              });

        hammer.get('rotate')
            .set({ enable: true });

        hammer.on(allGestureEvents, function(ev) {
            events[ ev.type ] = true;
          });
        events = {};
      },
    afterEach: function() {
        hammer && hammer.destroy();
        events = null;
      }
  });

QUnit.test('recognize pan', function(assert) {
    var done = assert.async();
    assert.expect(1);

    Simulator.gestures.pan(el, { duration: 500, deltaX: 100, deltaY: 0 }, function() {
        assert.deepEqual(events, {
            pan: true,
            panstart: true,
            panmove: true,
            panright: true,
            panend: true
          }, 'Pan events recognized');
        done();
      });
  });

QUnit.test('recognize press', function(assert) {
    var done = assert.async();
    assert.expect(1);

    Simulator.gestures.press(el, null, function() {
        assert.deepEqual(events, {
            press: true
          });
        done();
      }, 'only press was recognized');
  });

QUnit.test('recognize swipe', function(assert) {
    var done = assert.async();
    assert.expect(1);

    Simulator.gestures.swipe(el, { duration: 300, deltaX: 400, deltaY: 0 }, function() {
        assert.deepEqual(events, {
            pan: true,
            panstart: true,
            panmove: true,
            panright: true,
            panend: true,
            swipe: true,
            swiperight: true
          }, 'pan and swipe events were recognized');
        done();
      });
  });

QUnit.test('recognize pinch', function(assert) {
    var done = assert.async();
    assert.expect(1);

    Simulator.gestures.pinch(el, { duration: 500, scale: 0.5 }, function() {
        assert.deepEqual(events, {
            pinch: true,
            pinchstart: true,
            pinchmove: true,
            pinchend: true,
            pinchin: true
          }, 'pinch events were recognized');
        done();
      });
  });

QUnit.test('recognize children multitouch pinch', function(assert) {
    var done = assert.async();
    assert.expect(1);

    var el1 = utils.createHitArea(el);
    var el2 = utils.createHitArea(el);

    Simulator.gestures.pinch([ el1, el2 ], { duration: 500, scale: 0.5 }, function() {
        assert.deepEqual(events, {
            pinch: true,
            pinchstart: true,
            pinchmove: true,
            pinchend: true,
            pinchin: true
          }, 'pinch events on child were recognized');
        done();
      });
  });

QUnit.test('recognize parent-child multitouch pinch', function(assert) {
    var done = assert.async();
    assert.expect(1);

    var el1 = utils.createHitArea(el);

    Simulator.gestures.pinch([ el, el1 ], { duration: 100, scale: 0.5 }, function() {
        assert.deepEqual(events, {
            pinch: true,
            pinchstart: true,
            pinchmove: true,
            pinchend: true,
            pinchin: true
          }, 'Pinch events on parent were recognized');
        done();
      });
  });

QUnit.test('recognize rotate', function(assert) {
    var done = assert.async();
    assert.expect(1);

    Simulator.gestures.rotate(el, { duration: 500, scale: 1 }, function() {
        assert.deepEqual(events, {
            rotate: true,
            rotatestart: true,
            rotatemove: true,
            rotateend: true
          }, 'Rotate events recognized');
        done();
      });
  });

QUnit.test('recognize multitouch rotate', function(assert) {
    var done = assert.async();
    assert.expect(1);

    var el1 = utils.createHitArea(el);

    Simulator.gestures.rotate([ el, el1 ], { duration: 500, scale: 1 }, function() {
        assert.deepEqual(events, {
            rotate: true,
            rotatestart: true,
            rotatemove: true,
            rotateend: true
          }, 'Rotate events were recognized');
        done();
      });
  });

QUnit.test('recognize rotate and pinch simultaneous', function(assert) {
    var done = assert.async();
    assert.expect(1);

    Simulator.gestures.pinchRotate(el, { duration: 500, scale: 2 }, function() {
        assert.deepEqual(events, {
            rotate: true,
            rotatestart: true,
            rotatemove: true,
            rotateend: true,
            pinch: true,
            pinchstart: true,
            pinchmove: true,
            pinchend: true,
            pinchout: true
          }, 'Rotate and pinch were recognized together');
        done();
      });
  });

QUnit.test("don't recognize pan and swipe when moving down, when only horizontal is allowed", function(assert) {
    var done = assert.async();
    assert.expect(1);

    Simulator.gestures.swipe(el, { duration: 250, deltaX: 0, deltaZ: 200 }, function() {
        assert.deepEqual(events, { }, 'No events were recognized');
        done();
      });
  });

QUnit.test("don't recognize press if duration is too short.", function(assert) {
    var done = assert.async();
    assert.expect(1);

    Simulator.gestures.press(el, { duration: 240 });

    setTimeout(function() {
        assert.deepEqual(events, { tap: true }, 'Tap gesture has been recognized.');
        done();
      }, 275);
  });

QUnit.test("don't recognize tap if duration is too long.", function(assert) {
    var done = assert.async();
    assert.expect(1);

    Simulator.gestures.tap(el, { duration: 255 });

    setTimeout(function() {
        assert.deepEqual(events, { press: true }, 'Press gesture has been recognized.');
        done();
      }, 275);
  });

QUnit.test('transition from 1-finger pan to 2-finger pinch after pan cancels', function(assert) {
    assert.expect(3);

    var t0Start = { clientX: 100, clientY: 100, identifier: 0, target: el };
    var evStart = document.createEvent('Event');
    evStart.initEvent('touchstart', true, true);
    evStart.touches = evStart.targetTouches = [ t0Start ];
    evStart.changedTouches = [ t0Start ];
    el.dispatchEvent(evStart);

    var t0Move = { clientX: 130, clientY: 100, identifier: 0, target: el };
    var evPanMove = document.createEvent('Event');
    evPanMove.initEvent('touchmove', true, true);
    evPanMove.touches = evPanMove.targetTouches = [ t0Move ];
    evPanMove.changedTouches = [ t0Move ];
    el.dispatchEvent(evPanMove);

    // Second finger lands, cancelling 1-finger pan
    var t1Start = { clientX: 230, clientY: 100, identifier: 1, target: el };
    var evSecondStart = document.createEvent('Event');
    evSecondStart.initEvent('touchstart', true, true);
    evSecondStart.touches = evSecondStart.targetTouches = [ t0Move, t1Start ];
    evSecondStart.changedTouches = [ t1Start ];
    el.dispatchEvent(evSecondStart);

    // Both fingers spread apart to pinch out (distance 100 -> 200, scale = 2)
    var t0Pinch = { clientX: 80, clientY: 100, identifier: 0, target: el };
    var t1Pinch = { clientX: 280, clientY: 100, identifier: 1, target: el };
    var evPinchMove = document.createEvent('Event');
    evPinchMove.initEvent('touchmove', true, true);
    evPinchMove.touches = evPinchMove.targetTouches = [ t0Pinch, t1Pinch ];
    evPinchMove.changedTouches = [ t0Pinch, t1Pinch ];
    el.dispatchEvent(evPinchMove);

    assert.equal(events.pancancel, true, '1-finger pan was cancelled when 2nd finger landed');
    assert.equal(events.pinchstart, true, 'pinchstart recognized after pan cancelled');
    assert.equal(events.pinchout, true, 'pinchout recognized');
  });

QUnit.test('do not fire orphan pressup when press was cancelled by movement', function(assert) {
    var done = assert.async();
    assert.expect(2);

    var pressCount = 0;
    var pressUpCount = 0;
    hammer.on('press', function() {
        pressCount++;
      });
    hammer.on('pressup', function() {
        pressUpCount++;
      });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    // Move vertically past threshold (without triggering horizontal pan) so press timer resets, then return
    utils.dispatchTouchEvent(el, 'move', 50, 80);
    utils.dispatchTouchEvent(el, 'move', 50, 50);

    setTimeout(function() {
        utils.dispatchTouchEvent(el, 'end', 50, 50);
        assert.equal(pressCount, 0, 'press did not fire');
        assert.equal(pressUpCount, 0, 'orphan pressup did not fire');
        done();
      }, 280);
  });

QUnit.test('vertical two-finger touch computes accurate rotation and wraps across +-180 degrees', function(assert) {
    assert.expect(3);

    hammer.get('rotate').set({ enable: true, threshold: 5 });

    var lastRotation = null;
    hammer.on('rotatestart rotatemove', function(ev) {
        lastRotation = ev.rotation;
      });

    // Vertical finger pair (angle = -90 deg) moving down together with 0 rotation
    var v0Start = { clientX: 100, clientY: 50, identifier: 0, target: el };
    var v1Start = { clientX: 100, clientY: 150, identifier: 1, target: el };
    var evStart = document.createEvent('Event');
    evStart.initEvent('touchstart', true, true);
    evStart.touches = evStart.targetTouches = [ v0Start, v1Start ];
    evStart.changedTouches = [ v0Start, v1Start ];
    el.dispatchEvent(evStart);

    var v0Translate = { clientX: 100, clientY: 60, identifier: 0, target: el };
    var v1Translate = { clientX: 100, clientY: 160, identifier: 1, target: el };
    var evTranslate = document.createEvent('Event');
    evTranslate.initEvent('touchmove', true, true);
    evTranslate.touches = evTranslate.targetTouches = [ v0Translate, v1Translate ];
    evTranslate.changedTouches = [ v0Translate, v1Translate ];
    el.dispatchEvent(evTranslate);

    assert.equal(events.rotatestart, undefined, 'pure translation of vertical fingers has 0 rotation (not -180)');

    // Now rotate 90 degrees clockwise to horizontal (angle = 0 deg -> rotation = +90)
    var v0Rot = { clientX: 150, clientY: 100, identifier: 0, target: el };
    var v1Rot = { clientX: 50, clientY: 100, identifier: 1, target: el };
    var evRot = document.createEvent('Event');
    evRot.initEvent('touchmove', true, true);
    evRot.touches = evRot.targetTouches = [ v0Rot, v1Rot ];
    evRot.changedTouches = [ v0Rot, v1Rot ];
    el.dispatchEvent(evRot);

    assert.equal(Math.round(lastRotation), 90, 'clockwise 90 degree rotation from vertical reported as +90');

    var evEnd = document.createEvent('Event');
    evEnd.initEvent('touchend', true, true);
    evEnd.touches = evEnd.targetTouches = [];
    evEnd.changedTouches = [ v0Rot, v1Rot ];
    el.dispatchEvent(evEnd);

    // Test wrap-around across the +-180 degree atan2 branch cut
    var w0Start = { clientX: 50, clientY: 90, identifier: 0, target: el };
    var w1Start = { clientX: 150, clientY: 100, identifier: 1, target: el };
    var evWrapStart = document.createEvent('Event');
    evWrapStart.initEvent('touchstart', true, true);
    evWrapStart.touches = evWrapStart.targetTouches = [ w0Start, w1Start ];
    evWrapStart.changedTouches = [ w0Start, w1Start ];
    el.dispatchEvent(evWrapStart);

    var w0Move = { clientX: 50, clientY: 110, identifier: 0, target: el };
    var w1Move = { clientX: 150, clientY: 100, identifier: 1, target: el };
    var evWrapMove = document.createEvent('Event');
    evWrapMove.initEvent('touchmove', true, true);
    evWrapMove.touches = evWrapMove.targetTouches = [ w0Move, w1Move ];
    evWrapMove.changedTouches = [ w0Move, w1Move ];
    el.dispatchEvent(evWrapMove);

    assert.ok(lastRotation < 0 && lastRotation > -20, 'crossing +-180 branch cut reports small negative angle instead of ~349');
  });
