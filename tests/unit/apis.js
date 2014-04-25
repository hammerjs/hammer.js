function createPos(x,y) {
  return {
    pageX: x, pageY: y, clientX: x, clientY: y
  };
}

function createTouch(x,y,id) {
  return {
    pageX: x, pageY: y, clientX: x, clientY: y,
    identifier: id
  };
}

function createMouse(x,y,button) {
  return {
    pageX: x, pageY: y, clientX: x, clientY: y,
    button: button
  };
}

function createPointerEvent(x,y,id,type) {
  return {
    pageX: x, pageY: y, clientX: x, clientY: y,
    pointerId: id,
    pointerType: type,
    buttons: 1
  };
}

function triggerEvent(name, el) {
  var event = document.createEvent('Event');
  event.initEvent(name, true, true);
  el.dispatchEvent(event);
}



module("Utils");
  test('extend', function() {
    expect(2);
    deepEqual(
      Hammer.utils.extend(
        {a: 1, b: 3},
        {b: 2, c: 3}
      ),
      {a: 1, b: 2, c: 3},
      'Simple extend'
    );

    var src = { foo: true };
    var dest = Hammer.utils.extend({}, src);
    src.foo = false;
    deepEqual(dest, {foo: true}, 'Clone reference');
  });

  test('each', function() {
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

  test('inStr', function() {
    expect(2);
    ok(Hammer.utils.inStr("lorum ipsum", "ipsum"), 'in string');
    ok(!Hammer.utils.inStr("lorum ipsum", "not here"), 'not in string');
  });

  test('toCamelCase', function() {
    expect(4);
    equal(Hammer.utils.toCamelCase("camel-case"), 'camelCase');
    equal(Hammer.utils.toCamelCase("camel_case"), 'camelCase');
    equal(Hammer.utils.toCamelCase("camelCase"), 'camelCase');
    equal(Hammer.utils.toCamelCase("KeepCamelCASE"), 'KeepCamelCASE');
  });

  test('inArray', function() {
    expect(5);
    var array = [1, 2, 3, 4, 'aa', 'bb'];

    ok(Hammer.utils.inArray(array, "aa") === 4, 'in array');
    ok(Hammer.utils.inArray(array, 4) === 3, 'in array');
    ok(Hammer.utils.inArray(array, "4") === false, 'not in array');
    ok(Hammer.utils.inArray(array, 123) === false, 'not in array');
    ok(Hammer.utils.inArray(array, "a") === false, 'not in array');
  });

  test('getCenter', function() {
    expect(2);
    deepEqual(Hammer.utils.getCenter([createPos(100, 100), createPos(200, 200)]), createPos(150, 150), 'get center');
    deepEqual(Hammer.utils.getCenter([createPos(100, 100)]), createPos(100, 100), 'get center');
  });

  test('getVelocity', function() {
    expect(2);
    deepEqual(Hammer.utils.getVelocity(100, 20, 50), { x:.2, y:.5}, 'fast movement');
    deepEqual(Hammer.utils.getVelocity(250, 20, 50), { x:.08, y:.2}, 'slow movement');
  });

  test('getAngle', function() {
    expect(2);
    equal(Hammer.utils.getAngle(createPos(100, 100), createPos(200, 200)), 45, 'move right up (45 degrees)');
    equal(Hammer.utils.getAngle(createPos(100, 100), createPos(100, 100)), 0, 'dont move');
  });

  test('getDirection', function() {
    expect(4);
    equal(Hammer.utils.getDirection(createPos(100, 100), createPos(200, 100)), 'right', 'move right');
    equal(Hammer.utils.getDirection(createPos(100, 100), createPos(10, 100)), 'left', 'move left');
    equal(Hammer.utils.getDirection(createPos(100, 100), createPos(100, 200)), 'down', 'move down');
    equal(Hammer.utils.getDirection(createPos(100, 100), createPos(100, 0)), 'up', 'move up');
  });

  test('getDistance', function() {
    expect(5);
    equal(Hammer.utils.getDistance(createPos(100, 100), createPos(200, 100)), 100, 'utils.getDistance');
    equal(Hammer.utils.getDistance(createPos(100, 100), createPos(10, 100)), 90, 'utils.getDistance');
    equal(Hammer.utils.getDistance(createPos(100, 100), createPos(100, 200)), 100, 'utils.getDistance');
    equal(Hammer.utils.getDistance(createPos(100, 100), createPos(100, 0)), 100, 'utils.getDistance');
    equal(Math.round(Hammer.utils.getDistance(createPos(100, 100), createPos(150, 150))), 71, 'utils.getDistance');
  });

  test('getScale', function() {
    expect(4);
    var start = [createPos(100, 100), createPos(200, 200)];
    equal(Hammer.utils.getScale(start, start), 1, 'do nothing');
    equal(Hammer.utils.getScale(start, [createPos(50, 50), createPos(250, 250)]), 2, 'pinch out 2x');
    equal(Hammer.utils.getScale(start, [createPos(0, 0), createPos(300, 300)]), 3, 'pinch out 3x');
    equal(Hammer.utils.getScale(start, [createPos(150, 150), createPos(150, 150)]), 0, 'pinch in');
  });

  test('getRotation', function() {
    expect(2);
    var start = [createPos(100, 100), createPos(200, 200)];
    equal(Hammer.utils.getRotation(start, start), 0, 'dont rotate');
    equal(Hammer.utils.getRotation(start, [createPos(200, 200), createPos(100, 100)]), 180, 'rotate 180 degrees');
  });

  test('isVertical', function() {
    expect(4);
    var start = [createPos(100, 100), createPos(200, 200)];
    ok(Hammer.utils.isVertical('down'), 'down is vertical');
    ok(Hammer.utils.isVertical('up'), 'up is vertical');
    ok(!Hammer.utils.isVertical('right'), 'right is not vertical');
    ok(!Hammer.utils.isVertical('left'), 'left is not vertical');
  });


module("PointerEvent");
  test('all', function() {
    equal(Hammer.PointerEvent.getTouchList().length, 0, 'no pointers');

    var pe1 = createPointerEvent(100,100,1,'touch');
    var pe2 = createPointerEvent(200,200,2,'touch');

    Hammer.PointerEvent.updatePointer('start', pe1);
    equal(Hammer.PointerEvent.getTouchList().length, 1, '1 pointer');

    ok(Hammer.PointerEvent.matchType('touch', pe1), 'is touch pointer');

    Hammer.PointerEvent.updatePointer('move', pe1);
    Hammer.PointerEvent.updatePointer('start', pe2);
    equal(Hammer.PointerEvent.getTouchList().length, 2, '2 pointers');

    Hammer.PointerEvent.updatePointer('end', pe1);
    equal(Hammer.PointerEvent.getTouchList().length, 1, '1 pointer after end one');

    Hammer.PointerEvent.reset();
    equal(Hammer.PointerEvent.getTouchList().length, 0, '0 pointers after reset');
  });


module("Events");

  var domBindClickHandler = function() {
    ok(true, 'event is bound');
    start();
  };

  asyncTest('dom bind', function() {
    expect(1);
    var el = document.body;

    Hammer.event.on(el, "domevent0", domBindClickHandler);
    triggerEvent('domevent0', el);
  });

  asyncTest('dom unbind', function() {
    expect(1);
    var el = document.body;
    Hammer.event.off(el, "domevent0", domBindClickHandler);
    triggerEvent('domevent0', el);

    setTimeout(function() {
      ok(true, 'event is unbound');
      start();
    }, 100);
  });

  asyncTest('multiple dom bind', function() {
    expect(2);
    var el = document.body;
    var count = 0;
    function handler() {
      ok(true, 'event is bound');
      count++;
      count == 2 && start();
    }

    Hammer.event.on(el, "domevent1 domevent2", handler);
    triggerEvent('domevent1', el);
    triggerEvent('domevent2', el);
  });

  test('determineEventTypes', function() {
    expect(3);

    var types = Hammer.event.determineEventTypes();
    equal(types.start, 'touchstart mousedown', 'event type start');
    equal(types.move, 'touchmove mousemove', 'event type move');
    equal(types.end, 'touchend touchcancel mouseup', 'event type end');
  });

  test('determineEventTypes with pointer Events', function() {
    expect(3);

    Hammer.HAS_POINTEREVENTS = true;
    window.PointerEvent = true; // fake native

    var types = Hammer.event.determineEventTypes();
    equal(types.start, 'pointerdown', 'event type start');
    equal(types.move, 'pointermove', 'event type move');
    equal(types.end, 'pointerup pointercancel lostpointercapture', 'event type end');
  });

  test('getTouchList', function() {
    expect(3);

    Hammer.HAS_POINTEREVENTS = true;
    var pe1 = createPointerEvent(100,100,1,'touch');
    Hammer.PointerEvent.updatePointer('start', pe1);
    equal(Hammer.event.getTouchList({}, 'start').length, 1, 'getTouchList returns an array with PE');


    Hammer.HAS_POINTEREVENTS = false;
    var touch_ev = {touches: [createTouch(100,100,1)],changedTouches: [createTouch(100,100,1)]};
    equal(Hammer.event.getTouchList(touch_ev, 'start').length, 1, 'getTouchList returns an array with touches');

    var mouse_ev = createMouse(100,100,0);
    equal(Hammer.event.getTouchList(mouse_ev, 'start').length, 1, 'getTouchList returns an array with mouse');

  });
