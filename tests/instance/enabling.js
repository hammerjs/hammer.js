var el,
    hammer,
    event;

module("Hammer Instance - Enabling Detection", {
  setup: function() {
    el= document.getElementById('toucharea');
    Hammer.plugins.showTouches(true);
    hammer = new Hammer(el);
  },
  teardown: function() {
    hammer.dispose();
  }
});

test("can enable/disable the gesture recognition based on the hammer instance enable property", function() {

  var wasCalled = false;
  hammer.on("tap", function() {
    wasCalled = true;
  });

  event = document.createEvent('Event');
  event.initEvent('touchstart', true, true);
  event.touches = [{pageX: 0, pageY: 10}];
  el.dispatchEvent(event);

  ok(!wasCalled, 'tap was not fired on touch start');

  hammer.enable(false);

  event = document.createEvent('Event');
  event.initEvent('touchend', true, true);
  event.touches = [];
  el.dispatchEvent(event);

  ok(!wasCalled, 'tap was not fired on touchEnd because hammer instance is disabled');

  hammer.enable(true);

  event = document.createEvent('Event');
  event.initEvent('touchstart', true, true);
  event.touches = [{pageX: 0, pageY: 10}];
  el.dispatchEvent(event);

  event = document.createEvent('Event');
  event.initEvent('touchend', true, true);
  event.touches = [];
  el.dispatchEvent(event);

  ok(wasCalled, 'tap was fired when the hammer instance has been enabled and the gesture is executed again');

});
