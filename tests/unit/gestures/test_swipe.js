// jscs:disable requireArrowFunctions,disallowVar,requireEnhancedObjectLiterals
/* globals QUnit,Hammer,utils,Simulator */

var el;
var hammer;
var swipeCount = 0;

QUnit.module('Swipe Gesture', {
    beforeEach: function() {
        el = utils.createHitArea();
        hammer = new Hammer(el, { recognizers: [] });
        swipeCount = 0;
      },
    afterEach: function() {
        hammer.destroy();
      }
  });

QUnit.test('swipe can be recognized', function(assert) {
    assert.expect(1);
    var done = assert.async();
    var swipe = new Hammer.Swipe({ threshold: 1 });
    hammer.add(swipe);
    hammer.on('swipe', function() {
        assert.ok(true);
        done();
      });
    Simulator.gestures.swipe(el);
  });

QUnit.test('45-degree diagonal swipe (deltaX === deltaY) is recognized', function(assert) {
    var done = assert.async();
    assert.expect(1);

    var swipe = new Hammer.Swipe({ threshold: 10, velocity: 0.2, direction: Hammer.DIRECTION_ALL });
    hammer.add(swipe);
    hammer.on('swipe', function() {
        swipeCount++;
      });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    setTimeout(function() {
        utils.dispatchTouchEvent(el, 'move', 120, 120);
        utils.dispatchTouchEvent(el, 'end', 150, 150);
        assert.equal(swipeCount, 1, 'exact 45-degree diagonal swipe recognized');
        done();
      }, 50);
  });

QUnit.test('single-axis swipe checks velocity along configured axis', function(assert) {
    assert.expect(2);

    var swipe = new Hammer.Swipe({
        direction: Hammer.DIRECTION_HORIZONTAL,
        threshold: 10,
        velocity: 0.3
      });
    hammer.add(swipe);
    hammer.on('swipe', function() {
        swipeCount++;
      });

    // High overallVelocity (e.g. from another axis) but too-slow overallVelocityX
    hammer.recognize({
        pointers: [ { clientX: 70, clientY: 50 } ],
        changedPointers: [ { clientX: 70, clientY: 50 } ],
        eventType: Hammer.INPUT_END,
        maxPointers: 1,
        distance: 20,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        overallVelocity: 0.9,
        overallVelocityX: 0.1,
        overallVelocityY: 0.9,
        srcEvent: { preventDefault: function() {}, target: el },
        target: el
      });
    assert.equal(swipeCount, 0, 'rejected when horizontal velocity is below threshold');

    hammer.recognize({
        pointers: [ { clientX: 120, clientY: 50 } ],
        changedPointers: [ { clientX: 120, clientY: 50 } ],
        eventType: Hammer.INPUT_END,
        maxPointers: 1,
        distance: 70,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        overallVelocity: 0.6,
        overallVelocityX: 0.6,
        overallVelocityY: 0,
        srcEvent: { preventDefault: function() {}, target: el },
        target: el
      });
    assert.equal(swipeCount, 1, 'accepted when horizontal velocity exceeds threshold');
  });
