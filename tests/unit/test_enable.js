// jscs:disable requireArrowFunctions,disallowVar,requireEnhancedObjectLiterals
/* globals QUnit,Hammer,utils */
/* jshint unused:false */

var el,
    hammer,
    counter;

QUnit.module('Test recognizer enable', {
    beforeEach: function() {
        el = utils.createHitArea();
        hammer = new Hammer.Manager(el, { recognizers: [] });
        counter = 0;
      },
    afterEach: function() {
        hammer && hammer.destroy();
      }
  });

QUnit.test('should disable a recognizer through the `enable` constructor parameter', function(assert) {
    assert.expect(1);
    hammer.add(new Hammer.Tap({ enable: false }));
    hammer.on('tap', function() {
        counter++;
      });

    var done = assert.async();

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {

      assert.equal(counter, 0, 'counter is zero');
      done();
    }, 100);
  });

QUnit.test('should disable recognizing when the manager is disabled.', function(assert) {
    assert.expect(1);
    hammer.set({ enable: false });
    hammer.add(new Hammer.Tap());
    hammer.on('tap', function() {
        counter++;
      });

    var done = assert.async();

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        assert.equal(counter, 0, 'counter is zero');
        done();
      }, 100);
  });

QUnit.test('should toggle a recognizer using the `set` call to the recognizer enable property', function(assert) {
    assert.expect(2);

    hammer.add(new Hammer.Tap());
    hammer.on('tap', function() {
        counter++;
      });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    assert.equal(counter, 1);

    hammer.get('tap').set({ enable: false });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    assert.equal(counter, 1, 'counter is 1');
  });

QUnit.test('should accept the `enable` constructor parameter as function', function(assert) {
    assert.expect(2);

    var canRecognizeTap = false;

    var tap = new Hammer.Tap({
        enable: function() {
            return canRecognizeTap;
          }
      });

    hammer.add(tap);
    hammer.on('tap', function() {
        counter++;
      });

    var done = assert.async();
    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);

    setTimeout(function() {
        assert.equal(counter, 0, 'counter is zero');

        canRecognizeTap = true;

        utils.dispatchTouchEvent(el, 'start', 50, 50);
        utils.dispatchTouchEvent(el, 'end', 50, 50);

        assert.equal(counter, 1, 'counter is 1');
        done();
      }, 100);
  });

QUnit.test('should accept a function parameter with `set`', function(assert) {
    assert.expect(3);

    hammer.add(new Hammer.Tap());
    hammer.on('tap', function() {
        counter++;
      });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    assert.equal(counter, 1, 'counter is 1');

    var canRecognizeTap = false;
    hammer.get('tap').set({ enable: function() {
        return canRecognizeTap;
      } });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    assert.equal(counter, 1, 'counter is 1');

    canRecognizeTap = true;
    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    assert.equal(counter, 2, 'counter is 2');
  });

QUnit.test('should pass the recognizer and optional the input parameter to the `enable` callback', function(assert) {
    assert.expect(2);

    var tap;

    // The enable function is called initially to setup the touch-action property
    // at that moment there isn't any input
    var canEnable = function(recognizer, input) {
        assert.equal(recognizer, tap, 'recognizer is tap');
        return true;
      };
    tap = new Hammer.Tap({ enable: canEnable });
    hammer.add(tap);

    utils.dispatchTouchEvent(el, 'start', 50, 50);
  });

QUnit.test('should toggle based on other object method', function(assert) {
    assert.expect(2);

    var view = {
        state: 0,
        canRecognizeTap: function(recognizer, input) {
            return this.state !== 0;
          }
      };

    hammer.add(new Hammer.Tap({ enable: function(rec, input) {
        return view.canRecognizeTap(rec, input);
      } }));
    hammer.on('tap', function() {
        counter++;
      });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    assert.equal(counter, 0, 'counter is 0');

    view.state = 1;
    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    assert.equal(counter, 1, 'counter is 1');
  });
