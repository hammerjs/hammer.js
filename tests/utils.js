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


/**
 * math functions
 */
test('utils.math.scale', function() {
    expect(0);

    var normal_touches = [
        { pageX: 60, pageY: 220 },
        { pageX: 190, pageY: 75 }
    ];
    var wide_touches = [
        { pageX: 10, pageY: 240 },
        { pageX: 0, pageY: 200 }
    ];
    var narrow_touches = [
        { pageX: 120, pageY: 160 },
        { pageX: 150, pageY: 125 }
    ];

    //equal(Hammer.utils.scale({}))
});