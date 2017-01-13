// jscs:disable requireArrowFunctions,disallowVar,requireEnhancedObjectLiterals
/* globals QUnit,Hammer,utils,Simulator */

var el;
var hammer;

QUnit.module('Pan Gesture', {
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

QUnit.test('`panstart` and `panmove` should be recognized', function(assert) {
    assert.expect(2);

    var panMoveCount = 0;
    var pan = new Hammer.Pan({ threshold: 1 });

    hammer.add(pan);
    hammer.on('panstart', function() {
      assert.ok(true, 'Pan start triggered');
    });
    hammer.on('panmove', function() {
      panMoveCount++;
    });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'move', 70, 50);
    utils.dispatchTouchEvent(el, 'move', 90, 50);

    assert.equal(panMoveCount, 1, 'exactly one panMove triggered');
  });

QUnit.test('Pan event flow should be start -> left -> end', function(assert) {
    var done = assert.async();
    assert.expect(1);
    var pan = new Hammer.Pan({ threshold: 1 });
    hammer.add(pan);

    var eventflow = '';
    var isCalledPanleft = false;
    hammer.on('panstart', function() {
        eventflow += 'start';
      });
    hammer.on('panleft', function() {
        if (!isCalledPanleft) {
          isCalledPanleft = true;
          eventflow += 'left';
        }
      });
    hammer.on('panend', function() {
        eventflow += 'end';
        isCalledPanleft = true;
      });

    Simulator.gestures.pan(el, { deltaX: -100, deltaY: 0 }, function() {
        assert.equal(eventflow, 'startleftend', 'correct event flow');
        done();
      });
  });
