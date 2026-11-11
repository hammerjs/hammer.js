// jscs:disable requireArrowFunctions,disallowVar,requireEnhancedObjectLiterals
/* globals QUnit,Hammer,utils,el */

QUnit.module('eventEmitter');

QUnit.test('test the eventemitter', function(assert) {
    assert.expect(6);

    var ee = new Hammer.Manager(utils.createHitArea());
    var inputData = {
        target: document.body,
        srcEvent: {
            preventDefault: function() {
                assert.ok(true, 'preventDefault ref');
              },
            target: document.body
          }
      };

    function event3Handler() {
      assert.ok(true, 'emitted event3');
    }

    ee.on('testEvent1', function() {
        assert.ok(true, 'emitted event');
      });
    ee.on('testEvent2', function(ev) {
        assert.ok(true, 'emitted event');
        ev.preventDefault();
        assert.ok(ev.target === document.body, 'target is the body');
      });
    ee.on('testEvent3', event3Handler);

    ee.emit('testEvent1', inputData);
    ee.emit('testEvent2', inputData);
    ee.emit('testEvent3', inputData);

    // Unbind testEvent2
    ee.off('testEvent2');
    ee.off('testEvent3', event3Handler);

    ee.emit('testEvent1', inputData); // Should trigger testEvent1 again
    ee.emit('testEvent2', inputData); // Doenst trigger a thing
    ee.emit('testEvent3', inputData); // Doenst trigger a thing

    // Destroy
    ee.destroy();

    ee.emit('testEvent1', inputData); // Doenst trigger a thing
    ee.emit('testEvent2', inputData); // Doenst trigger a thing
    ee.emit('testEvent3', inputData); // Doenst trigger a thing
  });

/*
 * Hammer.Manager.off method : exception handling
 */
QUnit.test('When Hammer.Manager didnt attach an event, `off` method is ignored', function(assert) {
    var count = 0;
    var hammer = new Hammer(el, { inputTarget: document.body });
    hammer.off('swipeleft', function() {
        count++;
      });
    assert.ok(true, 'nothing');
    hammer.destroy();
  });

QUnit.test('`off` with an unregistered handler should not remove existing handlers', function(assert) {
    assert.expect(2);

    var ee = new Hammer.Manager(utils.createHitArea());
    var count1 = 0;
    var count2 = 0;
    var inputData = {
        target: document.body,
        srcEvent: {
            preventDefault: function() {},
            target: document.body
          }
      };

    function handler1() {
      count1++;
    }
    function handler2() {
      count2++;
    }
    function unregisteredHandler() {}

    ee.on('tap', handler1);
    ee.on('tap', handler2);
    ee.off('tap', unregisteredHandler);

    ee.emit('tap', inputData);

    assert.equal(count1, 1, 'first handler still called');
    assert.equal(count2, 1, 'last handler was not mistakenly spliced out');

    ee.destroy();
  });
