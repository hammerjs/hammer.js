# Hammer.js [![Build Status](https://travis-ci.org/EightMedia/hammer.js.png)](https://travis-ci.org/EightMedia/hammer.js/)

### A javascript library for multi-touch gestures

> I told you, homeboy /
> You *CAN* touch this /
> Yeah, that's how we living and you know /
> You *CAN* touch this


## Why the rewrite
- The previous Hammer.js became old, and too much of a hobby project: Inefficient code, bad documentation.
- It wasn't possible to add custom gestures, or change anything about the (inner) working of the gestures.
- It needed DOM events, to use with event delegation.
- Windows8 has touch AND mouse, so the Pointer Events API needs to be implemented, also other browsers on windows8 didn't respond to touches.


## Features
- DOM Events
- Debug plugins
- Custom gestures
- Better swipe event
- Chainable instance methods
- jQuery plugin with events delegation (the on/off methods) available
- Efficient code, lower memory usage
- IE8 and older compatibility with jQuery plugin
- More events for faster implementation (swipeleft, dragright)
- AMD support (RequireJS)
- Unit tests


## Getting Started
Hammer became simpler to use, with an jQuery-like API. You don't need to add the new keyword, and the eventlisteners are chainable.

````js
    var element = document.getElementById('test_el');
    var hammertime = Hammer(element).on("tap", function(event) {
        alert('hello!');
    });
````

You can change the default settings by adding an second argument with options

````js
    var hammertime = Hammer(element, {
        drag: false,
        transform: false
    });
````

Events can be added/removed with the on and off methods, just like you would in jQuery.
Event delegation is also possible when you use the jQuery plugin.

````js
    $('#test_el').hammer().on("tap", ".nested_el", function(event) {
        console.log(this, event);
    });
````

### Gesture Events
The following gestures are available, you can find options for it in gestures.js

- hold
- tap
- doubletap
- drag, dragstart, dragend, dragup, dragdown, dragleft, dragright
- swipe, swipeup, swipedown, swipeleft, swiperight
- transform, transformstart, transformend
- rotate
- pinch, pinchin, pinchout
- touch (gesture detection starts)
- release (gesture detection ends)


### Gesture Options
The following gestures are available, you can find options for it in gestures.js

    doubletap_distance: 20
    doubletap_interval: 300
    drag: true
    drag_block_horizontal: false
    drag_block_vertical: false
    drag_lock_to_axis: false
    drag_max_touches: 1
    drag_min_distance: 10
    hold: true
    hold_threshold: 3
    hold_timeout: 500
    prevent_default: true
    release: true
    show_touches: true
    stop_browser_behavior: Object
    swipe: true
    swipe_max_touches: 1
    swipe_velocity: 0.7
    tap: true
    tap_max_distance: 10
    tap_max_touchtime: 250
    touch: true
    transform: true
    transform_always_block: false
    transform_min_rotation: 1
    transform_min_scale: 0.01


### Event Data
The ````event```` argument in the callback contains the same properties for each gesture, making more sense for some than for others.
The gesture that was triggered is found in ````event.type````. Following properties are available in ````event.gesture````

    timestamp   {Number}        time the event occurred
    target      {HTMLElement}   target element
    touches     {Array}         touches (fingers, mouse) on the screen
    pointerType {String}        kind of pointer that was used. matches Hammer.POINTER_MOUSE|TOUCH
    center      {Object}        center position of the touches. contains pageX and pageY
    deltaTime   {Number}        the total time of the touches in the screen
    deltaX      {Number}        the delta on x axis we haved moved
    deltaY      {Number}        the delta on y axis we haved moved
    velocityX   {Number}        the velocity on the x
    velocityY   {Number}        the velocity on y
    angle       {Number}        the angle we are moving
    direction   {String}        the direction we are moving. matches Hammer.DIRECTION_UP|DOWN|LEFT|RIGHT
    distance    {Number}        the distance we haved moved
    scale       {Number}        scaling of the touches, needs 2 touches
    rotation    {Number}        rotation of the touches, needs 2 touches *
    eventType   {String}        matches Hammer.EVENT_START|MOVE|END
    srcEvent    {Object}        the source event, like TouchStart or MouseDown *
    startEvent  {Object}        contains the same properties as above,
                                but from the first touch. this is used to calculate
                                distances, deltaTime, scaling etc


## Compatibility
|                                   | Tap | Double Tap | Hold | Swipe | Drag | Multitouch |
|:----------------------------------|:----|:-----------|:-----|:------|:-----|:----------|
| **BlackBerry**                                                                         |
| Playbook                          | X   | X          | X    | X     | X    | X         |
| BlackBerry 10                     | X   | X          | X    | X     | X    | X         |
|                                                                                        |
| **iOS**                                                                                |
| iPhone/iPod iOS 6                 | X   | X          | X    | X     | X    | X         |
| iPad/iPhone iOS 5                 | X   | X          | X    | X     | X    | X         |
| iPhone iOS 4                      | X   | X          | X    | X     | X    | X         |
|                                                                                        |
| **Android 4**                                                                          |
| Default browser                   | X   | X          | X    | X     | X    | X         |
| Chrome                            | X   | X          | X    | X     | X    | X         |
| Opera                             | X   | X          | X    | X     | X    | X         |
| Firefox                           | X   | X          | X    | X     | X    | X         |
|                                                                                        |
| **Android 3**                                                                          |
| Default browser                   | X   | X          | X    | X     | X    | X         |
|                                                                                        |
| **Android 2**                                                                          |
| Default browser                   | X   | X          | X    | X     | X    |           |
| Firefox                           | X   | X          | X    | X     | X    |           |
| Opera Mobile                      | X   | X          | X    | X     | X    |           |
| Opera Mini                        | X   |            |      |       |      |           |
|                                                                                        |
| **Windows 8 touch**                                                                    |
| Internet Explorer 10              | X   | X          | X    | X     | X    | X         |
| Chrome                            | X   | X          | X    | X     | X    | X         |
| Firefox                           | X   | X          | X    | X     | X    | X         |
|                                                                                        |
| **Windows Phone 8**                                                                    |
| Internet Explorer 10              | X   | X          | X    | X     | X    | X         |
|                                                                                        |
| **Windows Phone 7.5**                                                                  |
| Internet Explorer                 | X   |            |      |       |      |           |
|                                                                                        |
| **Other devices**                                                                      |
| Kindle Fire                       | X   | X          | X    | X     | X    | X         |
| Nokia N900 - Firefox 1.1          | X   |            |      |       |      |           |
|                                                                                        |
| **Windows Dekstop**                                                                    |
| Internet Explorer 7**             | X   | X          | X    | X     | X    | X*        |
| Internet Explorer 8**             | X   | X          | X    | X     | X    | X*        |
| Internet Explorer 9               | X   | X          | X    | X     | X    | X*        |
| Internet Explorer 10              | X   | X          | X    | X     | X    | X*        |
|                                                                                        |
| **OSX**                                                                                |
| Firefox                           | X   | X          | X    | X     | X    | X*        |
| Opera                             | X   | X          | X    | X     | X    | X*        |
| Chrome                            | X   | X          | X    | X     | X    | X*        |
| Safari                            | X   | X          | X    | X     | X    | X*        |
|                                   | **Tap** | **Double Tap** | **Hold** | **Swipe** | **Drag** | **Multitouch** |

Android 2 doesn't support multi-touch events, so there's no transform callback on these Android versions.
Windows Phone 7.5 doesnt support touch and minimal mouse events.

Not all gestures are supported on every device. This matrix shows the support we have tested. This is of course far from extensive.
If you've tested hammer.js on a different device, please let us know.

*Multitouch gestures are available with the hammer.fakemultitouch.js plugin.

**Only when using the jQuery plugin.

## Custom Gestures##
####Gesture object####
The object structure of a gesture:

````js
{ 
  name: 'mygesture',
  index: 1337,
  defaults: {
     mygesture_option: true
  }
  handler: function(type, ev, inst) {
     // trigger gesture event
     inst.trigger(this.name, ev);
  }
}
````

###### `{String} name`
this should be the name of the gesture, lowercase
it is also being used to disable/enable the gesture per instance config.

###### `{Number} [index=1000]`
the index of the gesture, where it is going to be in the stack of gestures detection
like when you build an gesture that depends on the drag gesture, it is a good
idea to place it after the index of the drag gesture.

###### `{Object} [defaults={}]`
the default settings of the gesture. these are added to the instance settings,
and can be overruled per instance. you can also add the name of the gesture,
but this is also added by default (and set to true).

###### `{Function} handler`
this handles the gesture detection of your custom gesture and receives the
following arguments:

###### `{Object} eventData`
As described above, its the same data as the gesture events

###### `{Hammer.Instance} inst`
the instance we are doing the detection for. you can get the options from
the inst.options object and trigger the gesture event by calling inst.trigger


####Handle gestures####
inside the handler you can get/set Hammer.detection.current. This is the current
detection session. It has the following properties

###### `{String} name`
contains the name of the gesture we have detected. it has not a real function,
only to check in other gestures if something is detected.
like in the drag gesture we set it to 'drag' and in the swipe gesture we can
check if the current gesture is 'drag' by accessing Hammer.detection.current.name

###### `@readonly {Hammer.Instance} inst`
the instance we do the detection for

###### `@readonly {Object} startEvent`
contains the properties of the first gesture detection in this session.
Used for calculations about timing, distance, etc.

###### `@readonly {Object} lastEvent`
contains all the properties of the last gesture detect in this session.

after the gesture detection session has been completed (user has released the screen) the 
Hammer.detection.current object is copied into Hammer.detection.previous, this is usefull for gestures 
like doubletap, where you need to know if the previous gesture was a tap

options that have been set by the instance can be received by calling inst.options

You can trigger a gesture event by calling `inst.trigger("mygesture", event)`. The first param is the name of 
your gesture, the second the event argument

####Register gestures####
When an gesture is added to the `Hammer.gestures` object, it is auto registered at the setup of the first 
Hammer instance. You can also call `Hammer.detection.register` manually and pass your gesture object as a param


## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code using grunt.
Please don't commit the dist versions with your changes, only the changed source files.


## Further notes
Created by [Jorik Tangelder](http://twitter.com/jorikdelaporik) and developed at [Eight Media](http://www.eight.nl/) in Arnhem, the Netherlands.

It's recommend to listen to [this loop](http://soundcloud.com/eightmedia/hammerhammerhammer) while using hammer.js.
