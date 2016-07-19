// jscs:disable requireArrowFunctions,disallowVar,requireEnhancedObjectLiterals
/* globals QUnit,Hammer,utils*/
/*jshint -W079 */

var parent;
var child;
var hammerChild;
var hammerParent;

QUnit.module('Propagation (Tap in Child and Parent)', {
    beforeEach: function() {
        parent = document.createElement('div');
        child = document.createElement('div');

        document.getElementById('qunit-fixture').appendChild(parent);
        parent.appendChild(child);

        hammerParent = new Hammer.Manager(parent);
        hammerChild = new Hammer.Manager(child);

        hammerChild.add(new Hammer.Tap());
        hammerParent.add(new Hammer.Tap());
      },
    afterEach: function() {
        hammerChild.destroy();
        hammerParent.destroy();
      }
  });

QUnit.test('Tap on the child, fires also the tap event to the parent', function(assert) {
    assert.expect(2);

    hammerChild.on('tap', function() {
        assert.ok(true);
      });
    hammerParent.on('tap', function() {
        assert.ok(true);
      });

    utils.dispatchTouchEvent(child, 'start', 0, 10);
    utils.dispatchTouchEvent(child, 'end', 0, 10);
  });

QUnit.test('When tap on the child and the child stops the input event propagation, the tap event does not get fired in the parent', function(assert) {
    assert.expect(1);

    hammerChild.on('tap', function() {
        assert.ok(true);
      });
    hammerParent.on('tap', function() {
        throw new Error('parent tap gesture should not be recognized');
      });

    child.addEventListener('touchend', function(ev) {
        ev.stopPropagation();
      });

    utils.dispatchTouchEvent(child, 'start', 0, 10);
    utils.dispatchTouchEvent(child, 'end', 0, 10);
  });
