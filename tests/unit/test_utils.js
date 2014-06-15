module("utils");
test("get/set prefixed util", function () {
    ok(_.isUndefined(prefixedName(window, 'FakeProperty')), 'non existent property returns undefined');

    window.webkitFakeProperty = 1337;
    ok(prefixedName(window, 'FakeProperty') == 'webkitFakeProperty', 'existent prefixed property returns the prefixed name');
});

test("fnBind", function() {
    var context = { a: true };

    bindFn(function(b) {
        ok(this.a === true, "bindFn scope");
        ok(b === 123, "bindFn argument");
    }, context)(123);
});

(function() {
    function testInherit() {
        function Base() {
            this.name = true;
        }

        function Child() {
            Base.call(this);
        }

        inherit(Child, Base, {
            newMethod: function () {
            }
        });

        var inst = new Child();

        ok(inst.name == true, 'child has extended from base');
        ok(inst.newMethod, 'child has a new method');
        ok(Child.prototype.newMethod, 'child has a new prototype method');
        ok(inst instanceof Child, 'is instanceof Child');
        ok(inst instanceof Base, 'is instanceof Base');
        ok(inst._super === Base.prototype, '_super is ref to prototype of Base');
    }

    test("Inherit objects", testInherit);

    test("Inherit objects without Object.create", function () {
        Object.backupCreate = Object.create;
        Object.create = null;
        testInherit();
        Object.create = Object.backupCreate;
    });
})();

test("toArray", function () {
    ok(_.isArray(toArray({ 0: true, 1: 'second', length: 2 })), 'converted an array-like object to an array');
    ok(_.isArray(toArray([true, true])), 'array stays an array');
});

test("inArray", function () {
    ok(inArray([1, 2, 3, 4, "hammer"], "hammer") === 4, "found item and returned the index");
    ok(inArray([1, 2, 3, 4, "hammer"], "notfound") === -1, "not found an item and returned -1");
    ok(inArray([
        {id: 2},
        {id: 24}
    ], "24", "id") === 1, "find by key and return the index");
    ok(inArray([
        {id: 2},
        {id: 24}
    ], "22", "id") === -1, "not found by key and return -1");
});

test("splitStr", function () {
    deepEqual(splitStr(" a  b  c d   "), ['a','b','c','d'], "str split valid");
});

test("uniqueArray", function () {
    deepEqual(uniqueArray([
        {id: 1},
        {id: 2},
        {id: 2}
    ], 'id'), [
        {id: 1},
        {id: 2}
    ], "remove duplicate ids")
});

test('each', function () {
    var object = { hi: true };
    var array = ['a', 'b', 'c'];
    var loop;

    loop = false;
    each(object, function (value, key) {
        if (key == 'hi' && value === true) {
            loop = true;
        }
    });
    ok(loop, 'object loop');

    loop = 0;
    each(array, function (value, key) {
        if (value) {
            loop++;
        }
    });
    ok(loop == 3, 'array loop');

    loop = 0;
    array.forEach = null;
    each(array, function (value, key) {
        if (value) {
            loop++;
        }
    });
    ok(loop == 3, 'array loop without Array.forEach');
});

test('extend', function() {
    expect(2);
    deepEqual(
      extend(
        {a: 1, b: 3},
        {b: 2, c: 3}
      ),
      {a: 1, b: 2, c: 3},
      'Simple extend'
    );

    var src = { foo: true };
    var dest = extend({}, src);
    src.foo = false;
    deepEqual(dest, {foo: true}, 'Clone reference');
  });

test('merge', function() {
    expect(2);
    deepEqual(
      merge(
        {a: 1, b: 3},
        {b: 2, c: 3}
      ),
      {a: 1, b: 3, c: 3},
      'Simple extend'
    );

    var src = { foo: true };
    var dest = merge({ foo: true }, src);
    src.foo = false;
    deepEqual(dest, {foo: true}, 'Clone reference');
});

test('test add/removeEventListener', function() {
    function handleEvent() {
        ok(true, "triggered event");
    }

    expect(2);

    addEventListeners(window, "testEvent1  testEvent2  ", handleEvent);
    triggerEvent(window, 'testEvent1');
    triggerEvent(window, 'testEvent2');

    removeEventListeners(window, " testEvent1 testEvent2 ", handleEvent);
    triggerEvent(window, 'testEvent1');
    triggerEvent(window, 'testEvent2');
});
