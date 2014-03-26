var el1, el2,
    hammer1, hammer2,
    event;

module("Hammer Integration - Multiple Gestures", {
  setup: function() {
    el1= document.getElementById('toucharea1');
    el2= document.getElementById('toucharea2');
    hammer1 = new Hammer(el1);
    hammer2 = new Hammer(el2);
  },
  teardown: function() {
    hammer1.dispose();
    hammer2.dispose();
  }
});

test("can recognize two gestures of the same type simultaneously", function() {

  var draggingCounter1 = 0,
      draggingCounter2 = 0;

  hammer1.on("drag", function() {
    draggingCounter1++;
  });

  hammer2.on("drag", function() {
    draggingCounter2++;
  });
  dispatchEvent(el1, 'start', 0, 10);
  ok(draggingCounter1 === 0, 'drag is not fired on touch start');

  dispatchEvent(el2, 'start', 0, 10);
  ok(draggingCounter2 === 0, 'drag is not fired on touch start');

  dispatchEvent(el1, 'move', 20, 10);
  ok(draggingCounter1 === 1, 'drag has been fired once on touch move');

  dispatchEvent(el2, 'move', 20, 10);
  ok(draggingCounter2 === 1, 'drag has been fired once on touch move');

});

function dispatchEvent(el, name, x, y) {

  var event = document.createEvent('Event');
  event.initEvent('touch'+name, true, true);
  event.touches = [{pageX: x, pageY: y}];
  el.dispatchEvent(event);

};
