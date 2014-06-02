test("get/set prefixed util", function() {
    ok(_.isUndefined(prefixed(window, 'FakeProperty')), 'non existent property returns undefined');

    window.webkitFakeProperty = 1337;
    ok(prefixed(window, 'FakeProperty') == 1337, 'existent prefixed property returns the value');
    ok(prefixed(window, 'FakeProperty', 123) == 123, 'set the value of the prefixed property');

    window.webkitFakeProperty = function(val) { return val; };
    ok(prefixed(window, 'FakeProperty', ['test123']) == 'test123', 'execute existent prefixed function and return the value');

    ok(_.isFunction(prefixed(window, 'FakeProperty')), 'return an fnBind function');
});

test("Inherit objects", function() {
    function Base() {
        this.name = true;
    }

    function Child() {
        Base.call(this);
    }

    inherit(Child, Base, {
        newMethod: function() { }
    });

    var inst = new Child();

    ok(inst.name == true, 'child has extended from base');
    ok(inst.newMethod, 'child has a new method');
    ok(Child.prototype.newMethod, 'child has a new prototype method');
    ok(inst instanceof Child, 'is instanceof Child');
    ok(inst instanceof Base, 'is instanceof Base');
    ok(inst._super, '_super is defined');
});

test("toArray", function() {
    ok(_.isArray(toArray({ 0: true, 1: 'second', length: 2 })), 'converted an array-like object to an array');
    ok(_.isArray(toArray([true, true])), 'array stays an array');
});

test("round", function() {
    ok(round(1.2) === 1, "round 1.2 to 1");
    ok(round(1.51) === 2, "round 1.51 to 2");
});

test("inArray", function() {
    ok(inArray([1,2,3,4,"hammer"], "hammer") === 4, "found item and returned the index");
    ok(inArray([1,2,3,4,"hammer"], "notfound") === -1, "not found an item and returned -1");
    ok(inArray([{id: 2},{id:24}], "24", "id") === 1, "find by key and return the index");
});

test("inStr", function() {
    ok(inStr("hammer", "h"), "found in string");
    ok(!inStr("hammer", "d"), "not found in string");
});

test("uniqueArray", function() {
    deepEqual(uniqueArray([{id:1}, {id:2}, {id:2}], 'id'), [{id:1}, {id:2}], "remove duplicate ids")
})
