// jscs:disable requireArrowFunctions,disallowVar,requireEnhancedObjectLiterals
/* globals QUnit,Hammer,utils,Simulator */

var el;
var hammer;
var pressPeriod = 200;
var pressThreshold = 20;
var pressCount = 0;
var panStartCount = 0;
var swipeCount = 0;

QUnit.module('Require Failure ( Swipe & Press )', {
    beforeEach: function() {
        el = utils.createHitArea();
        hammer = new Hammer(el, { recognizers: [] });

        var swipe = new Hammer.Swipe({ threshold: 1 });
        var press = new Hammer.Press({ time: pressPeriod, threshold: pressThreshold });

        hammer.add(swipe);
        hammer.add(press);

        swipe.recognizeWith(press);
        press.requireFailure(swipe);

        pressCount = 0;
        swipeCount = 0;
        hammer.on('press', function() {
            pressCount++;
          });
        hammer.on('swipe', function() {
            swipeCount++;
          });
      },
    afterEach: function() {
        hammer.destroy();
      }
  });

QUnit.test('When swipe does not recognize the gesture, a press gesture can be fired', function(assert) {
    var done = assert.async();
    assert.expect(1);

    utils.dispatchTouchEvent(el, 'start', 50, 50);

    setTimeout(function() {
        assert.equal(pressCount, 1, '1 press recognized');
        done();
      }, pressPeriod + 100);
  });

QUnit.test('When swipe does recognize the gesture, a press gesture cannot be fired', function(assert) {
    var done = assert.async();
    assert.expect(2);

    Simulator.gestures.swipe(el, null, function() {
      assert.ok(swipeCount > 0, 'swipe gesture should be recognizing');

      assert.equal(pressCount, 0, 'press gesture should not be recognized because swipe gesture is recognizing');
      done();
    });
  });
QUnit.module('Require Failure ( Pan & Press )', {
    beforeEach: function() {
        el = document.createElement('div');
        document.body.appendChild(el);

        hammer = new Hammer(el, { recognizers: [] });

        var pan = new Hammer.Pan({ threshold: 1 });
        var press = new Hammer.Press({ time: pressPeriod, threshold: pressThreshold });

        hammer.add([ pan, press ]);

        pan.recognizeWith(press);
        press.requireFailure(pan);

        pressCount = 0;
        panStartCount = 0;
        hammer.on('press', function() {
            pressCount++;
          });
        hammer.on('panstart', function() {
            panStartCount++;
          });
      },
    afterEach: function() {
        document.body.removeChild(el);
        hammer.destroy();
      }
  });

QUnit.test('When pan does not recognize the gesture, a press gesture can be fired', function(assert) {
    var done = assert.async();
    assert.expect(1);

    utils.dispatchTouchEvent(el, 'start', 50, 50);

    setTimeout(function() {
      assert.equal(pressCount, 1, '1 press recognized');
      done();
    }, pressPeriod + 100);
  });

QUnit.test('When pan recognizes the gesture, a press gesture cannot be fired', function(assert) {
    var done = assert.async();
    assert.expect(2);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'move', 50 + pressThreshold / 4, 50);

    setTimeout(function() {
      assert.ok(panStartCount > 0, 'pan gesture should be recognizing');

      assert.equal(pressCount, 0, 'press gesture should not be recognized because pan gesture is recognizing');
      done();
    }, pressPeriod + 100);
  });

QUnit.test('`requireFailure` should be one-way so pan still works after press is recognized', function(assert) {
    var done = assert.async();
    assert.expect(3);

    assert.equal(hammer.get('pan').requireFail.length, 0, 'pan should not require press to fail');

    utils.dispatchTouchEvent(el, 'start', 50, 50);

    setTimeout(function() {
      assert.equal(pressCount, 1, 'press recognized first');

      utils.dispatchTouchEvent(el, 'move', 80, 50);
      utils.dispatchTouchEvent(el, 'end', 80, 50);

      assert.ok(panStartCount > 0, 'pan still recognized after press because dependency is one-way');
      done();
    }, pressPeriod + 50);
  });

QUnit.test('`tap.requireFailure(doubletap)` fires doubletap immediately without waiting for interval', function(assert) {
    assert.expect(2);

    var localEl = utils.createHitArea();
    var mc = new Hammer.Manager(localEl, { recognizers: [] });
    var tap = new Hammer.Tap();
    var doubleTap = new Hammer.Tap({ event: 'doubletap', taps: 2 });

    mc.add([ tap, doubleTap ]);
    doubleTap.recognizeWith(tap);
    tap.requireFailure(doubleTap);

    var doubleTapFired = 0;
    mc.on('doubletap', function() {
        doubleTapFired++;
      });

    utils.dispatchTouchEvent(localEl, 'start', 50, 50);
    utils.dispatchTouchEvent(localEl, 'end', 50, 50);
    utils.dispatchTouchEvent(localEl, 'start', 50, 50);
    utils.dispatchTouchEvent(localEl, 'end', 50, 50);

    assert.equal(doubleTap.requireFail.length, 0, 'doubletap does not require tap to fail');
    assert.equal(doubleTapFired, 1, 'doubletap fired synchronously on second touchend');

    mc.destroy();
  });
