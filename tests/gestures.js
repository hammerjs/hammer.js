var faker,
  hammertime,
  test_el,
  triggered_events,
  TESTER_NAME,
  FAKETOUCH_TYPE;

var testers = {
  'mouseevents': function() {
      Hammer.HAS_POINTEREVENTS = false;
      Hammer.HAS_TOUCHEVENTS = false;
      FAKETOUCH_TYPE = FakeTouches.MOUSE_EVENTS;
  },

  'touchevents': function() {
      Hammer.HAS_POINTEREVENTS = false;
      Hammer.HAS_TOUCHEVENTS = true;
      FAKETOUCH_TYPE = FakeTouches.TOUCH_EVENTS;
  },

  'mousetouchevents': function() {
      Hammer.HAS_POINTEREVENTS = false;
      Hammer.HAS_TOUCHEVENTS = true;
      FAKETOUCH_TYPE = FakeTouches.TOUCH_AND_MOUSE_EVENTS;
  },

  'pointerevents_mouse': function() {
      Hammer.HAS_POINTEREVENTS = true;
      Hammer.HAS_TOUCHEVENTS = false;
      FAKETOUCH_TYPE = FakeTouches.POINTER_MOUSE_EVENTS;
  },

  'pointerevents_touch': function() {
      Hammer.HAS_POINTEREVENTS = true;
      Hammer.HAS_TOUCHEVENTS = false;
      FAKETOUCH_TYPE = FakeTouches.POINTER_TOUCH_EVENTS;
  }
};


for(var name in testers) {
  testers[name]();

  TESTER_NAME = name;
  runHammerTests();
}


function runHammerTests() {
  // reset hammer ready state
  Hammer.READY = false;

  if(test_el) {
    document.body.removeChild(test_el);
  }

  // create new element/reset
  test_el = document.createElement('div');
  test_el.style.width = '500px';
  test_el.style.height = '500px';
  document.body.appendChild(test_el);


  // create faketouches instance
  faker = new FakeTouches(test_el);
  faker.setTouchType(FAKETOUCH_TYPE);

  // hammer
  hammertime = new Hammer(test_el);


  // all events
  var all_events = ["touch", "release", "hold", "tap", "doubletap",
      "dragstart", "drag", "dragend", "dragleft", "dragright",
      "dragup", "dragdown", "swipe", "swipeleft", "swiperight",
      "swipeup", "swipedown", "transformstart", "transform",
      "transformend", "rotate", "pinch", "pinchin", "pinchout"];

  // keep track of what events are triggered
  triggered_events = {};
  hammertime.on(all_events.join(" "), function(ev) {
      triggered_events[ev.type] = ev;
  });


  /**
   * test gestures
   */
  var gesture_tests = {
      'Hold' : 'touch hold release',
      'Tap' : 'touch tap release',
      'DoubleTap' : 'touch tap doubletap release',
      'DragRight' : 'touch drag dragstart dragright dragend release',
      'SwipeRight' : 'touch drag dragstart dragright dragend swipe swiperight release',
      'Rotate' : 'touch transform transformstart transformend rotate release',
      'PinchIn' : 'touch transform transformstart transformend pinch pinchin release',
      'PinchOut' : 'touch transform transformstart transformend pinch pinchout release'
  };

  for(var gesture in gesture_tests) {
      if(gesture_tests.hasOwnProperty(gesture)) {
          (function(gesture) {
              if(gesture_tests[gesture].match(/transform/) && !faker.has_multitouch) {
                  return;
              }

              asyncTest(TESTER_NAME +": "+ gesture, function() {
                  testGesture(gesture, gesture_tests[gesture], function(success, msg) {
                      ok(success, TESTER_NAME +": "+ msg);
                      start();
                  });
              });
          })(gesture);
      }
  }
}


/**
 * test gestures
 * @param   {String}    gesture
 * @param   {String}    expect_events
 * @param   {Function}  callback
 */
function testGesture(gesture, expect_events, callback) {
    // reset triggered events
    triggered_events = {};

    // trigger the gesture faker
    faker.triggerGesture(gesture, function() {

        var expected_events = expect_events.split(" ");
        var events = Object.keys(triggered_events);

        _.each(triggered_events, function(ev, name) {
            testEventData(name, ev);
        });

        // trigger callback with true/false is all the events are triggered
        // if also any other events are triggered it is false
        var success = (events.length === expected_events.length);

        // error msg
        var msg = gesture +" detected";
        if(!success) {
            msg = gesture +" error. Events fired: "+ events.join(" ");
        }

        // maybe something happens after the end, so wait a moment
        callback(success, msg);
    });
}


/**
 * test if event data contains wright values
 * @param   {String}    name
 * @param   {Object}    ev
 */
function testEventData(name, ev) {
    // types match
    ok(ev.type == name, 'ev.type');

    // has gesture object
    ok(_.isObject(ev.gesture), 'ev.gesture');

    // EVENT_START|MOVE|END
    ok(ev.gesture.eventType, 'ev.gesture.eventType');

    ok(_.isNumber(ev.gesture.angle), 'ev.gesture.angle');
    ok(_.isObject(ev.gesture.center), 'ev.gesture.center');
    ok(_.isNumber(ev.gesture.deltaTime), 'ev.gesture.deltatime');
    ok(_.isNumber(ev.gesture.deltaX), 'ev.gesture.deltaX');
    ok(_.isNumber(ev.gesture.deltaY), 'ev.gesture.deltaY');
    ok(_.isNumber(ev.gesture.distance), 'ev.gesture.distance');

    // direction
    ok(ev.gesture.direction, 'ev.gesture.direction');
    var direction;
    if(direction = ev.type.match(/up|down|left|right/)) {
        ok(ev.gesture.direction === Hammer['DIRECTION_'+ direction[0].toUpperCase()]);
    }

    // pointerType
    ok(ev.gesture.pointerType, 'ev.gesture.pointerType');
    var pointer_type = Hammer.POINTER_TOUCH;
    if( faker.touch_type == FakeTouches.POINTER_MOUSE_EVENTS ||
        faker.touch_type == FakeTouches.MOUSE_EVENTS) {
        pointer_type = Hammer.POINTER_MOUSE;
    }
    ok(ev.gesture.pointerType == pointer_type, 'not matching pointertype: '+ ev.gesture.pointerType +':'+ pointer_type);

    ok(_.isFunction(ev.gesture.preventDefault), 'ev.gesture.preventDefault');
    ok(_.isNumber(ev.gesture.rotation), 'ev.gesture.rotation');
    ok(_.isNumber(ev.gesture.scale), 'ev.gesture.scale');
    ok(_.isObject(ev.gesture.srcEvent), 'ev.gesture.srcEvent');
    ok(_.isObject(ev.gesture.startEvent), 'ev.gesture.startEvent');
    ok(_.isFunction(ev.gesture.stopDetect), 'ev.gesture.stopDetect');
    ok(_.isFunction(ev.gesture.stopPropagation), 'ev.gesture.stopPropagation');
    ok(_.isElement(ev.gesture.target), 'ev.gesture.target');
    ok(_.isNumber(ev.gesture.timeStamp), 'ev.gesture.timeStamp');
    ok(_.isArray(ev.gesture.touches), 'ev.gesture.touches');
    ok(ev.gesture.touches.length >= 1, 'ev.gesture.touches');
    ok(_.isNumber(ev.gesture.velocityX), 'ev.gesture.velocityX');
    ok(_.isNumber(ev.gesture.velocityY), 'ev.gesture.velocityY');
}