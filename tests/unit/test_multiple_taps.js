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
