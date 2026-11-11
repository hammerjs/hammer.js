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

QUnit.test('Pan with DIRECTION_ALL recognizes vertical movement within COMPUTE_INTERVAL', function(assert) {
    assert.expect(2);

    var pan = new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 10 });
    hammer.add(pan);

    var panStarted = false;
    var panDown = false;
    hammer.on('panstart', function() {
        panStarted = true;
      });
    hammer.on('pandown', function() {
        panDown = true;
      });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'move', 50, 80);
    utils.dispatchTouchEvent(el, 'end', 50, 80);

    assert.equal(panStarted, true, 'vertical panstart recognized immediately');
    assert.equal(panDown, true, 'pandown recognized with DIRECTION_ALL');
  });

QUnit.test('Consecutive pans with identical final delta are both recognized', function(assert) {
    assert.expect(1);

    var pan = new Hammer.Pan({ threshold: 10 });
    hammer.add(pan);

    var panStartCount = 0;
    hammer.on('panstart', function() {
        panStartCount++;
      });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'move', 70, 50);
    utils.dispatchTouchEvent(el, 'end', 70, 50);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'move', 70, 50);
    utils.dispatchTouchEvent(el, 'end', 70, 50);

    assert.equal(panStartCount, 2, 'second identical pan was not dropped by stale pX/pY');
  });
