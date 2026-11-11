// jscs:disable requireArrowFunctions,disallowVar,requireEnhancedObjectLiterals
/* globals QUnit,Hammer,utils*/

var el;
var hammer;

var tripleTapCount = 0;
var doubleTapCount = 0;
var tapCount = 0;

QUnit.module('Tap delay', {
    beforeEach: function() {
        el = utils.createHitArea();
        hammer = new Hammer(el, { recognizers: [] });

        var tap = new Hammer.Tap();
        var doubleTap = new Hammer.Tap({ event: 'doubleTap', taps: 2 });
        var tripleTap = new Hammer.Tap({ event: 'tripleTap', taps: 3 });

        hammer.add([ tripleTap, doubleTap, tap ]);

        tripleTap.recognizeWith([ doubleTap, tap ]);
        doubleTap.recognizeWith(tap);

        doubleTap.requireFailure(tripleTap);
        tap.requireFailure([ tripleTap, doubleTap ]);

        tripleTapCount = 0;
        doubleTapCount = 0;
        tapCount = 0;

        hammer.on('tap', function() {
            tapCount++;
          });
        hammer.on('doubleTap', function() {
            doubleTapCount++;
          });
        hammer.on('tripleTap', function() {
            tripleTapCount++;
          });
      },
    afterEach: function() {
        hammer.destroy();
      }
  });
QUnit.test('When a tripleTap is fired, doubleTap and Tap should not be recognized', function(assert) {
    var done = assert.async();
    assert.expect(3);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        assert.equal(tripleTapCount, 1, 'one tripletap event');
        assert.equal(doubleTapCount, 0, 'no doubletap event');
        assert.equal(tapCount, 0, 'no singletap event');
        done();
      }, 350);
  });
QUnit.test('When a doubleTap is fired, tripleTap and Tap should not be recognized', function(assert) {
    var done = assert.async();
    assert.expect(3);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        assert.equal(tripleTapCount, 0, 'No tripple taps recognized');
        assert.equal(doubleTapCount, 1, '1 double tap recognized');
        assert.equal(tapCount, 0, 'No single taps recognized');
        done();
      }, 350);
  });

QUnit.test('When a tap is fired, tripleTap and doubleTap should not be recognized', function(assert) {
    var done = assert.async();
    assert.expect(3);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        assert.equal(tripleTapCount, 0, 'No tripple taps recognized');
        assert.equal(doubleTapCount, 0, 'No double taps recognized');
        assert.equal(tapCount, 1, '1 single tap recognized');
        done();
      }, 350);
  });

QUnit.test('Lifting a two-finger touch sequentially should not fire a single-finger tap', function(assert) {
    var done = assert.async();
    assert.expect(1);

    var touch0 = { clientX: 50, clientY: 50, identifier: 0, target: el };
    var touch1 = { clientX: 70, clientY: 50, identifier: 1, target: el };

    var start0 = document.createEvent('Event');
    start0.initEvent('touchstart', true, true);
    start0.touches = start0.targetTouches = [ touch0 ];
    start0.changedTouches = [ touch0 ];
    el.dispatchEvent(start0);

    var start1 = document.createEvent('Event');
    start1.initEvent('touchstart', true, true);
    start1.touches = start1.targetTouches = [ touch0, touch1 ];
    start1.changedTouches = [ touch1 ];
    el.dispatchEvent(start1);

    var end1 = document.createEvent('Event');
    end1.initEvent('touchend', true, true);
    end1.touches = end1.targetTouches = [ touch0 ];
    end1.changedTouches = [ touch1 ];
    el.dispatchEvent(end1);

    var end0 = document.createEvent('Event');
    end0.initEvent('touchend', true, true);
    end0.touches = end0.targetTouches = [];
    end0.changedTouches = [ touch0 ];
    el.dispatchEvent(end0);

    setTimeout(function() {
        assert.equal(tapCount, 0, 'No ghost single tap recognized after 2-finger touch');
        done();
      }, 350);
  });

QUnit.test('An intervening pan between two taps within interval should not fire doubleTap', function(assert) {
    var done = assert.async();
    assert.expect(2);

    // First tap
    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    // Intervening drag/pan exceeding tap movement threshold
    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'move', 100, 50);
    utils.dispatchTouchEvent(el, 'end', 100, 50);

    // Second tap within interval at original location
    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        assert.equal(doubleTapCount, 0, 'No doubleTap recognized across intervening pan');
        assert.equal(tapCount, 1, 'Second tap recognized as a single tap');
        done();
      }, 350);
  });
