// jscs:disable requireArrowFunctions,disallowVar,requireEnhancedObjectLiterals
/* globals QUnit,Hammer,Simulator */

var el;
var hammer;

QUnit.module('Pinch Gesture', {
    beforeEach: function() {
        el = document.createElement('div');
        document.body.appendChild(el);

        hammer = new Hammer(el, { recognizers: [] });
      },
    afterEach: function() {
        document.body.removeChild(el);
        hammer.destroy();
      }
  });

QUnit.test('Pinch event flow should be start -> in -> end', function(assert) {
    var done = assert.async();
    assert.expect(1);
    var pinch = new Hammer.Pinch({ enable: true, threshold: 0.1 });
    hammer.add(pinch);

    var eventflow = '';
    var isFiredPinchin = false;
    hammer.on('pinchstart', function() {
        eventflow += 'start';
      });
    hammer.on('pinchin', function() {
        if (!isFiredPinchin) {
          isFiredPinchin = true;
          eventflow += 'in';
        }
      });
    hammer.on('pinchend', function() {
        eventflow += 'end';
        isFiredPinchin = false;
      });

    Simulator.gestures.pinch(el, { duration: 500, scale: 0.5 }, function() {
        assert.equal(eventflow, 'startinend', 'correct event flow');
        done();
      });
  });
