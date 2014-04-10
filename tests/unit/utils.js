function getTouch(x,y) {
  return { pageX: x, pageY: y, clientX: x, clientY: y };
}

/**
 * extend objects with new params
 */
test('utils.extend', function() {
  expect(1);
  deepEqual(
    Hammer.utils.extend(
      {a: 1, b: 3},
      {b: 2, c: 3}
    ),
    {a: 1, b: 2, c: 3},
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

  deepEqual(dest, {foo: true}, 'Clone reference');
});


test('utils.inStr', function() {
  expect(2);
  ok(Hammer.utils.inStr("lorum ipsum", "ipsum"), 'in string');
  ok(!Hammer.utils.inStr("lorum ipsum", "not here"), 'not in string');
});

test('utils.inArray', function() {
  expect(5);
  var array = [1, 2, 3, 4, 'aa', 'bb'];

  ok(Hammer.utils.inArray(array, "aa"), 'in array');
  ok(Hammer.utils.inArray(array, 4), 'in array');
  ok(!Hammer.utils.inArray(array, "4"), 'not in array');
  ok(!Hammer.utils.inArray(array, 123), 'not in array');
  ok(!Hammer.utils.inArray(array, "a"), 'not in array');
});

test('utils.getCenter', function() {
  expect(2);
  deepEqual(Hammer.utils.getCenter([getTouch(100, 100), getTouch(200, 200)]), getTouch(150, 150), 'get center');
  deepEqual(Hammer.utils.getCenter([getTouch(100, 100)]), getTouch(100, 100), 'get center');
});

test('utils.getVelocity', function() {
  expect(2);
  deepEqual(Hammer.utils.getVelocity(100, 20, 50), { x:.2, y:.5}, 'fast movement');
  deepEqual(Hammer.utils.getVelocity(250, 20, 50), { x:.08, y:.2}, 'slow movement');
});

test('utils.getAngle', function() {
  expect(2);
  equal(Hammer.utils.getAngle(getTouch(100, 100), getTouch(200, 200)), 45, 'move right up (45 degrees)');
  equal(Hammer.utils.getAngle(getTouch(100, 100), getTouch(100, 100)), 0, 'dont move');
});

test('utils.getDirection', function() {
  expect(4);
  equal(Hammer.utils.getDirection(getTouch(100, 100), getTouch(200, 100)), 'right', 'move right');
  equal(Hammer.utils.getDirection(getTouch(100, 100), getTouch(10, 100)), 'left', 'move left');
  equal(Hammer.utils.getDirection(getTouch(100, 100), getTouch(100, 200)), 'down', 'move down');
  equal(Hammer.utils.getDirection(getTouch(100, 100), getTouch(100, 0)), 'up', 'move up');
});

test('utils.getDistance', function() {
  expect(5);
  equal(Hammer.utils.getDistance(getTouch(100, 100), getTouch(200, 100)), 100, 'utils.getDistance');
  equal(Hammer.utils.getDistance(getTouch(100, 100), getTouch(10, 100)), 90, 'utils.getDistance');
  equal(Hammer.utils.getDistance(getTouch(100, 100), getTouch(100, 200)), 100, 'utils.getDistance');
  equal(Hammer.utils.getDistance(getTouch(100, 100), getTouch(100, 0)), 100, 'utils.getDistance');
  equal(Math.round(Hammer.utils.getDistance(getTouch(100, 100), getTouch(150, 150))), 71, 'utils.getDistance');
});

test('utils.getScale', function() {
  expect(4);
  var start = [getTouch(100, 100), getTouch(200, 200)];
  equal(Hammer.utils.getScale(start, start), 1, 'do nothing');
  equal(Hammer.utils.getScale(start, [getTouch(50, 50), getTouch(250, 250)]), 2, 'pinch out 2x');
  equal(Hammer.utils.getScale(start, [getTouch(0, 0), getTouch(300, 300)]), 3, 'pinch out 3x');
  equal(Hammer.utils.getScale(start, [getTouch(150, 150), getTouch(150, 150)]), 0, 'pinch in');
});

test('utils.getRotation', function() {
  expect(2);
  var start = [getTouch(100, 100), getTouch(200, 200)];
  equal(Hammer.utils.getRotation(start, start), 0, 'dont rotate');
  equal(Hammer.utils.getRotation(start, [getTouch(200, 200), getTouch(100, 100)]), 180, 'rotate 180 degrees');
});

test('utils.isVertical', function() {
  expect(4);
  var start = [getTouch(100, 100), getTouch(200, 200)];
  ok(Hammer.utils.isVertical('down'), 'down is vertical');
  ok(Hammer.utils.isVertical('up'), 'up is vertical');
  ok(!Hammer.utils.isVertical('right'), 'right is not vertical');
  ok(!Hammer.utils.isVertical('left'), 'left is not vertical');
});

test('utils.each', function() {
  expect(2);

  var object = { hi: true };
  var array = ['a','b','c'];

  var object_loop = false;
  var array_loop = 0;

  Hammer.utils.each(object, function(value, key) {
    if(key == 'hi' && value === true) {
      object_loop = true;
    }
  });
  ok(object_loop, 'object loop');

  Hammer.utils.each(array, function(value, key) {
    if(value) {
      array_loop++;
    }
  });
  ok(array_loop==3, 'array loop');
});