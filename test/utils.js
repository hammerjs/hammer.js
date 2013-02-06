/**
 * extend objects with new params
 */
test('utils.extend', function() {
    expect(1);
    deepEqual(
        Hammer.utils.extend(
            {a:1,b:3},
            {b:2,c:3}
        ),
        {a:1,b:2,c:3},
        'Simple extend'
    );
});

test('utils.extend.deep', function() {
    expect(1);
    deepEqual(
        Hammer.utils.extend(
            {a:1,b:{b:1},c:3},
            {b:{a:1,b:2}},
            1   // depth
        ),
        {a:1,b:{a:1,b:2},c:3},
        'Deep extend'
    );
});


/**
 * cloning with the extend util
 * test clone references
 */
test('utils.extend.clone', function() {
    expect(1);

    var src = { foo: true };
    var dest = Hammer.utils.extend({}, src);
    src.foo = false;

    deepEqual(dest, {foo:true}, 'Clone reference');
});


test('utils.extend.clone.deep', function() {
    expect(1);

    var src = {foo:{bar:true}};
    var dest = Hammer.utils.extend({}, src, 1);
    src.foo.bar = false;

    deepEqual(dest, {foo:{bar:true}}, 'Deep clone reference');
});