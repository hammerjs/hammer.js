// jscs:disable requireArrowFunctions,disallowVar,requireEnhancedObjectLiterals
/* globals QUnit,Hammer,utils,Simulator,$,jQuery */

var el, hammer, events;

var jQueryPluginPath = '../../node_modules/jquery-hammerjs/jquery.hammer.js';

QUnit.module('jQuery plugin', {
    beforeEach: function() {
        el = utils.createHitArea();
        events = {};
      },
    afterEach: function() {
        hammer && hammer.destroy();
      }
  });

QUnit.test('trigger pan with jQuery', function(assert) {
    var done = assert.async();
    assert.expect(2);

    $.getScript(jQueryPluginPath, function() {
        jQuery(el).hammer();
        jQuery(el).bind('panstart pan panmove panright panend', function(ev) {
            if (ev.gesture) {
              events[ ev.type ] = true;
            }
          });

        Simulator.gestures.pan(el, { deltaX: 50, deltaY: 0 }, function() {

            assert.deepEqual(events, {
                pan: true,
                panstart: true,
                panmove: true,
                panright: true,
                panend: true
              }, 'Pan events recognized');

            assert.ok(jQuery(el).data('hammer') instanceof Hammer.Manager, 'data attribute refers to the instance');
            done();
          });
      });
  });

QUnit.test('trigger pan without jQuery should still work', function(assert) {
    var done = assert.async();
    assert.expect(1);
    var hammer = new Hammer(el);
    hammer.on('panstart pan panmove panright panend', function(ev) {
        events[ev.type] = true;
      });
    Simulator.gestures.pan(el, { deltaX: 50, deltaY: 0 }, function() {
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
