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
