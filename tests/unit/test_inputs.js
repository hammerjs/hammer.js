// jscs:disable requireArrowFunctions,disallowVar,requireEnhancedObjectLiterals
/* globals QUnit,Hammer,utils */

var el;
var hammer;

QUnit.module('Input classes & TouchAction', {
    beforeEach: function() {
        el = utils.createHitArea();
      },
    afterEach: function() {
        if (hammer) {
          hammer.destroy();
          hammer = null;
        }
      }
  });

function createMouseEvent(type, x, y, extra) {
  var ev = document.createEvent('Event');
  ev.initEvent(type, true, true);
  ev.clientX = x;
  ev.clientY = y;
  ev.button = 0;
  ev.which = 1;
  if (extra) {
    Hammer.assign(ev, extra);
  }
  return ev;
}

function createPointerEvent(type, x, y, id, pointerType, buttons) {
  var ev = document.createEvent('Event');
  ev.initEvent(type, true, true);
  ev.clientX = x;
  ev.clientY = y;
  ev.pointerId = id;
  ev.pointerType = pointerType || 'mouse';
  ev.button = 0;
  ev.buttons = buttons !== undefined ? buttons : (type === 'pointerup' ? 0 : 1);
  return ev;
}

QUnit.test('MouseInput binds DOM listeners and recognizes mouse gestures', function(assert) {
    assert.expect(2);

    hammer = new Hammer(el, { inputClass: Hammer.MouseInput });
    var tapCount = 0;
    var panEndCount = 0;
    hammer.on('tap', function() {
        tapCount++;
      });
    hammer.on('panend', function() {
        panEndCount++;
      });

    el.dispatchEvent(createMouseEvent('mousedown', 50, 50));
    window.dispatchEvent(createMouseEvent('mouseup', 50, 50, { which: 0 }));
    assert.equal(tapCount, 1, 'MouseInput recognized tap');

    el.dispatchEvent(createMouseEvent('mousedown', 50, 50));
    window.dispatchEvent(createMouseEvent('mousemove', 90, 50));
    window.dispatchEvent(createMouseEvent('mouseup', 90, 50, { which: 0 }));
    assert.equal(panEndCount, 1, 'MouseInput recognized pan');
  });

QUnit.test('PointerEventInput binds DOM listeners, preserves pointers snapshot, and ends drag on buttons === 0', function(assert) {
    assert.expect(3);

    hammer = new Hammer(el, { inputClass: Hammer.PointerEventInput });
    var capturedEndPointers = null;
    var panEndCount = 0;

    hammer.on('panend', function(ev) {
        capturedEndPointers = ev.pointers;
        panEndCount++;
      });

    el.dispatchEvent(createPointerEvent('pointerdown', 50, 50, 1, 'mouse', 1));
    window.dispatchEvent(createPointerEvent('pointermove', 90, 50, 1, 'mouse', 1));
    window.dispatchEvent(createPointerEvent('pointerup', 90, 50, 1, 'mouse', 0));

    assert.equal(panEndCount, 1, 'PointerEventInput bound listeners and recognized panend');
    assert.equal(capturedEndPointers && capturedEndPointers.length, 1, 'ev.pointers snapshot not mutated after callback');

    // Start another drag, then simulate mouse re-entering window with button already released (buttons === 0)
    el.dispatchEvent(createPointerEvent('pointerdown', 50, 50, 2, 'mouse', 1));
    window.dispatchEvent(createPointerEvent('pointermove', 90, 50, 2, 'mouse', 1));
    window.dispatchEvent(createPointerEvent('pointermove', 100, 50, 2, 'mouse', 0));

    assert.equal(panEndCount, 2, 'pointermove with buttons === 0 cleanly terminates stuck drag');
  });

QUnit.test('SingleTouchInput initializes cleanly, emits single start, and ignores outside touches', function(assert) {
    assert.expect(2);

    var outside = utils.createHitArea();
    hammer = new Hammer(el, { inputClass: Hammer.SingleTouchInput });

    var inputStarts = 0;
    hammer.on('hammer.input', function(ev) {
        if (ev.isFirst) {
          inputStarts++;
        }
      });

    // Touch outside target element (bubbles to window)
    utils.dispatchTouchEvent(outside, 'start', 10, 10);
    utils.dispatchTouchEvent(outside, 'end', 10, 10);
    assert.equal(inputStarts, 0, 'touch outside target element was ignored');

    // Touch inside target element (bubbles to window, should only start once)
    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    assert.equal(inputStarts, 1, 'touch inside target element emitted exactly one INPUT_START');
  });

QUnit.test('TouchInput ignores orphan touchmove and keeps pointers sorted by identifier on touchend', function(assert) {
    assert.expect(2);

    hammer = new Hammer(el, { inputClass: Hammer.TouchInput });
    hammer.get('rotate').set({ enable: true });

    var moveEvents = 0;
    hammer.on('hammer.input', function() {
        moveEvents++;
      });

    // Orphan touchmove without a preceding touchstart on target
    utils.dispatchTouchEvent(el, 'move', 80, 50);
    assert.equal(moveEvents, 0, 'orphan touchmove without touchstart was ignored');

    var endRotation = null;
    hammer.on('rotateend', function(ev) {
        endRotation = ev.rotation;
      });

    // Start 2-finger rotate (0 deg -> +30 deg), then lift finger 0 first!
    var t0Start = { clientX: 150, clientY: 100, identifier: 0, target: el };
    var t1Start = { clientX: 50, clientY: 100, identifier: 1, target: el };
    var evStart = document.createEvent('Event');
    evStart.initEvent('touchstart', true, true);
    evStart.touches = evStart.targetTouches = [ t0Start, t1Start ];
    evStart.changedTouches = [ t0Start, t1Start ];
    el.dispatchEvent(evStart);

    var rad = 30 * Math.PI / 180;
    var t0Move = {
        clientX: Math.round(100 + 50 * Math.cos(rad)),
        clientY: Math.round(100 + 50 * Math.sin(rad)),
        identifier: 0,
        target: el
      };
    var t1Move = {
        clientX: Math.round(100 - 50 * Math.cos(rad)),
        clientY: Math.round(100 - 50 * Math.sin(rad)),
        identifier: 1,
        target: el
      };
    var evMove = document.createEvent('Event');
    evMove.initEvent('touchmove', true, true);
    evMove.touches = evMove.targetTouches = [ t0Move, t1Move ];
    evMove.changedTouches = [ t0Move, t1Move ];
    el.dispatchEvent(evMove);

    // Lift identifier 0 first while identifier 1 remains in touches
    var evEnd0 = document.createEvent('Event');
    evEnd0.initEvent('touchend', true, true);
    evEnd0.touches = evEnd0.targetTouches = [ t1Move ];
    evEnd0.changedTouches = [ t0Move ];
    el.dispatchEvent(evEnd0);

    assert.ok(endRotation !== null && Math.abs(endRotation - 30) <= 2,
      'lifting first finger preserves pointer order instead of flipping rotation by 180 degrees');
  });

QUnit.test('TouchMouseInput checks srcEvent.sourceCapabilities and supports set({ inputTarget })', function(assert) {
    assert.expect(3);

    hammer = new Hammer(el, { inputClass: Hammer.TouchMouseInput });
    var tapCount = 0;
    hammer.on('tap', function() {
        tapCount++;
      });

    // Synthetic mouse event carrying sourceCapabilities.firesTouchEvents = true on srcEvent
    el.dispatchEvent(createMouseEvent('mousedown', 200, 200, {
        sourceCapabilities: { firesTouchEvents: true }
      }));
    window.dispatchEvent(createMouseEvent('mouseup', 200, 200, {
        which: 0,
        sourceCapabilities: { firesTouchEvents: true }
      }));
    assert.equal(tapCount, 0, 'mouse event with srcEvent.sourceCapabilities.firesTouchEvents was ignored');

    // Rebind inputTarget dynamically via set()
    var otherTarget = utils.createHitArea();
    hammer.set({ inputTarget: otherTarget });

    utils.dispatchTouchEvent(el, 'start', 50, 50);
    utils.dispatchTouchEvent(el, 'end', 50, 50);
    assert.equal(tapCount, 0, 'old inputTarget was unbound');

    utils.dispatchTouchEvent(otherTarget, 'start', 50, 50);
    utils.dispatchTouchEvent(otherTarget, 'end', 50, 50);
    assert.equal(tapCount, 1, 'new inputTarget bound and recognized tap');
  });

QUnit.test('TouchAction does not call preventDefault on non-cancelable events', function(assert) {
    assert.expect(3);

    hammer = new Hammer(el, { touchAction: 'none' });
    var preventCalls = 0;
    var nonCancelableEvent = {
        cancelable: false,
        preventDefault: function() {
            preventCalls++;
          }
      };

    hammer.touchAction.preventSrc(nonCancelableEvent);
    assert.equal(preventCalls, 0, 'preventSrc skips preventDefault when cancelable is false');
    assert.ok(!hammer.session.prevented, 'session not marked prevented when event was non-cancelable');

    hammer.session.prevented = true;
    hammer.touchAction.preventDefaults({
        pointers: [ { clientX: 80, clientY: 50 } ],
        distance: 30,
        deltaTime: 300,
        offsetDirection: Hammer.DIRECTION_RIGHT,
        srcEvent: nonCancelableEvent
      });
    assert.equal(preventCalls, 0, 'preventDefaults also skips preventDefault when cancelable is false');
  });
