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
