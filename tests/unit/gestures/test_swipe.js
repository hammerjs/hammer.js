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
