// jscs:disable requireArrowFunctions,disallowVar,requireEnhancedObjectLiterals
/* globals QUnit,Hammer,utils,_*/

QUnit.module('utils');

// For the tests, all hammer properties and methods of Hammer are exposed to window.Hammer

QUnit.test('get/set prefixed util', function(assert) {
    assert.ok(_.isUndefined(Hammer.prefixed(window, 'FakeProperty')), 'non existent property returns undefined');

    window.webkitFakeProperty = 1337;
    assert.ok(Hammer.prefixed(window, 'FakeProperty') == 'webkitFakeProperty', 'existent prefixed property returns the prefixed name');

    delete window.webkitFakeProperty;
  });

QUnit.test('fnBind', function(assert) {
    var context = { a: true };

    Hammer.bindFn(function(b) {
        assert.ok(this.a === true, 'bindFn scope');
        assert.ok(b === 123, 'bindFn argument');
      }, context)(123);
  });

QUnit.test('Inherit objects', function(assert) {
    function Base() {
      this.name = true;
    }

    function Child() {
      Base.call(this);
    }

    Hammer.inherit(Child, Base, {
        newMethod: function() {
        }
      });

    var inst = new Child();

    assert.ok(inst.name == true, 'child has extended from base');
    assert.ok(inst.newMethod, 'child has a new method');
    assert.ok(Child.prototype.newMethod, 'child has a new prototype method');
    assert.ok(inst instanceof Child, 'is instanceof Child');
    assert.ok(inst instanceof Base, 'is instanceof Base');
    assert.ok(inst._super === Base.prototype, '_super is ref to prototype of Base');
  });

QUnit.test('toArray', function(assert) {
    assert.ok(_.isArray(Hammer.toArray({ 0: true, 1: 'second', length: 2 })), 'converted an array-like object to an array');
    assert.ok(_.isArray(Hammer.toArray([ true, true ])), 'array stays an array');
  });

QUnit.test('inArray', function(assert) {
    assert.ok(Hammer.inArray([ 1, 2, 3, 4, 'hammer' ], 'hammer') === 4, 'found item and returned the index');
    assert.ok(Hammer.inArray([ 1, 2, 3, 4, 'hammer' ], 'notfound') === -1, 'not found an item and returned -1');
    assert.ok(Hammer.inArray([
        { id: 2 },
        { id: 24 }
    ], '24', 'id') === 1, 'find by key and return the index');
    assert.ok(Hammer.inArray([
        { id: 2 },
        { id: 24 }
    ], '22', 'id') === -1, 'not found by key and return -1');
  });

QUnit.test('splitStr', function(assert) {
    assert.deepEqual(Hammer.splitStr(' a  b  c d   '), [ 'a', 'b', 'c', 'd' ], 'str split valid');
  });

QUnit.test('uniqueArray', function(assert) {
    assert.deepEqual(Hammer.uniqueArray([
        { id: 1 },
        { id: 2 },
        { id: 2 }
    ], 'id'), [
        { id: 1 },
        { id: 2 }
    ], 'remove duplicate ids');
  });

QUnit.test('boolOrFn', function(assert) {
    assert.equal(Hammer.boolOrFn(true), true, 'Passing an boolean');
    assert.equal(Hammer.boolOrFn(false), false, 'Passing an boolean');
    assert.equal(Hammer.boolOrFn(function() {
        return true;
      }), true, 'Passing an boolean');
    assert.equal(Hammer.boolOrFn(1), true, 'Passing an integer');
  });

QUnit.test('hasParent', function(assert) {
    var parent = document.createElement('div');
    var child = document.createElement('div');

    document.body.appendChild(parent);
    parent.appendChild(child);

    assert.equal(Hammer.hasParent(child, parent), true, 'Found parent');
    assert.equal(Hammer.hasParent(parent, child), false, 'Not in parent');

    document.body.removeChild(parent);
  });

QUnit.test('each', function(assert) {
    var object = { hi: true };
    var array = [ 'a', 'b', 'c' ];
    var loop;

    loop = false;
    Hammer.each(object, function(value, key) {
        if (key == 'hi' && value === true) {
          loop = true;
        }
      });
    assert.ok(loop, 'object loop');

    loop = 0;
    Hammer.each(array, function(value) {
        if (value) {
          loop++;
        }
      });
    assert.ok(loop == 3, 'array loop');

    loop = 0;
    array.forEach = null;
    Hammer.each(array, function(value) {
        if (value) {
          loop++;
        }
      });
    assert.ok(loop == 3, 'array loop without Array.forEach');
  });

QUnit.test('assign', function(assert) {
    assert.expect(2);
    assert.deepEqual(
        Hammer.assign(
            { a: 1, b: 3 },
            { b: 2, c: 3 }
        ),
        { a: 1, b: 2, c: 3 },
        'Simple extend'
    );

    var src = { foo: true };
    var dest = Hammer.assign({}, src);
    src.foo = false;
    assert.deepEqual(dest, { foo: true }, 'Clone reference');
  });

QUnit.test('test add/removeEventListener', function(assert) {
    function handleEvent() {
      assert.ok(true, 'triggered event');
    }

    assert.expect(2);

    Hammer.addEventListeners(window, 'testEvent1  testEvent2  ', handleEvent);
    utils.triggerDomEvent(window, 'testEvent1');
    utils.triggerDomEvent(window, 'testEvent2');

    Hammer.removeEventListeners(window, ' testEvent1 testEvent2 ', handleEvent);
    utils.triggerDomEvent(window, 'testEvent1');
    utils.triggerDomEvent(window, 'testEvent2');
  });
