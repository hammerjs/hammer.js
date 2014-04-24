# Custom gestures

With Hammer.js it is easy to add your own gestures, just take a look at the gesture files.

When an gesture is added to the Hammer.gestures object, it is auto registered
at the setup of the first Hammer instance. You can also call Detection.register
manually and pass your gesture object as a param

## Gesture object

The object structure of a gesture:

````js
{ name: 'myGesture',
  index: 1337,
  defaults: {
	myGestureOption: true
  }
  handler: function(ev, inst) {
	// trigger gesture event
	inst.trigger(this.name, ev);
  }
}
````

`@param   {String}    name`

this should be the name of the gesture, lowercase
it is also being used to disable/enable the gesture per instance config.

`@param   {Number}    [index=1000]`

the index of the gesture, where it is going to be in the stack of gestures detection
like when you build an gesture that depends on the drag gesture, it is a good
idea to place it after the index of the drag gesture.

`@param   {Object}    [defaults={}]`

the default settings of the gesture. these are added to the instance settings,
and can be overruled per instance. you can also add the name of the gesture,
but this is also added by default (and set to true).


### Gesture handler
`@param   {Function}  handler`
this handles the gesture detection of your custom gesture and receives the
following arguments:

`@param  {Object}    eventData`

event data containing the following properties:
````js
 timeStamp   {Number}        time the event occurred
 target      {HTMLElement}   target element
 touches     {Array}         touches (fingers, pointers, mouse) on the screen
 pointerType {String}        kind of pointer that was used. matches POINTER_MOUSE|TOUCH
 center      {Object}        center position of the touches. contains pageX and pageY
 deltaTime   {Number}        the total time of the touches in the screen
 deltaX      {Number}        the delta on x axis we haved moved
 deltaY      {Number}        the delta on y axis we haved moved
 velocityX   {Number}        the velocity on the x
 velocityY   {Number}        the velocity on y
 angle       {Number}        the angle we are moving
 direction   {String}        the direction we are moving. matches DIRECTION_UP|DOWN|LEFT|RIGHT
 distance    {Number}        the distance we haved moved
 scale       {Number}        scaling of the touches, needs 2 touches
 rotation    {Number}        rotation of the touches, needs 2 touches *
 eventType   {String}        matches EVENT_START|MOVE|END
 srcEvent    {Object}        the source event, like TouchStart or MouseDown *
 startEvent  {Object}        contains the same properties as above,
                             but from the first touch. this is used to calculate
                             distances, deltaTime, scaling etc
````

`@param  {Hammer.Instance}    inst`

the instance we are doing the detection for. you can get the options from
the inst.options object and trigger the gesture event by calling inst.trigger


## Handle gestures

inside the handler you can get/set Detection.current. This is the current
detection session. It has the following properties

`@param  {String}    name`

contains the name of the gesture we have detected. it has not a real function,
only to check in other gestures if something is detected.
like in the drag gesture we set it to 'drag' and in the swipe gesture we can
check if the current gesture is 'drag' by accessing Detection.current.name


`@readonly
@param  {Hammer.Instance}    inst`

the instance we do the detection for

`@readonly
@param  {Object}    startEvent`

contains the properties of the first gesture detection in this session.
Used for calculations about timing, distance, etc.

`@readonly
@param  {Object}    lastEvent`

contains all the properties of the last gesture detect in this session.

after the gesture detection session has been completed (user has released the screen)
the Detection.current object is copied into Detection.previous,
this is usefull for gestures like doubletap, where you need to know if the
previous gesture was a tap

options that have been set by the instance can be received by calling inst.options

You can trigger a gesture event by calling inst.trigger("mygesture", event).
The first param is the name of your gesture, the second the event argument
