# Hammer.js v2 (release candidate)
### A javascript library for multi-touch gestures

> I told you, homeboy /
> You *CAN* touch this /
> Yeah, that's how we living and you know /
> You *CAN* touch this


## Demo
[Watch the demo's](http://eightmedia.github.com/hammer.js/v2/). 
It always needs some testing with all kind of devices, please contribute!


## Why the rewrite
- The previous Hammer.js became old, and too much of a hobby project: Inefficient code, bad documentation.
- It wasn't possible to add custom gestures, or change anything about the (inner) working of the gestures.
- It needed DOM events, to use with event event delegation.
- Windows8 has touch AND mouse, so the Pointer Events API needs to be implemented.
- Did I mentioned the code was inefficient? Now a Hammer instance is light, and only contains the methods it should.


## New features in v2
- DOM Events
- Debug plugins
- Custom gestures api
- jQuery plugin with events delegation (the on/off methods) available
- Efficient code, lower memory usage
- IE8 and older compatibility with jQuery plugin


## How to use it
Hammer became simpler to use, with an jQuery-like API. You dont need to add the new keyword, and the eventlisteners are chainable.

    var element = document.getElementById('test_el');
    var hammertime = Hammer(element).on("tap", function(event) {
        alert('hello!');
    });

You can change the default settings by adding an second argument with options

    var hammertime = Hammer(element, {
        drag: false,
        transform: false
    });

Events can be added/removed with the on and off methods, just like you would in jQuery.
Event delegation is also possible when you use the jQuery plugin.

    $('#test_el').hammer().on("tap", ".nested_el", function(event) {
        console.log(this, event);
    });

The ````event```` argument in the callback contains the same properties for each gesture, making more sense for some then for others.
The gesture that was triggered is found in ````event.type````. Following properties are available in ````event.gesture````

    time        {Number}        time the event occurred
    target      {HTMLElement}   target element
    touches     {Array}         touches (fingers, pointers, mouse) on the screen
    center      {Object}        center position of the touches. contains pageX and pageY
    touchTime   {Number}        the total time of the touches in the screen
    angle       {Number}        the angle we are moving
    direction   {String}        the direction we are moving. matches Hammer.DIRECTION_UP|DOWN|LEFT|RIGHT
    distance    {Number}        the distance we haved moved
    distanceX   {Number}        the distance on x axis we haved moved
    distanceY   {Number}        the distance on y axis we haved moved
    scale       {Number}        scaling of the touches, needs 2 touches
    rotation    {Number}        rotation of the touches, needs 2 touches *
    eventType   {String}        matches Hammer.EVENT_START|MOVE|END
    srcEvent    {Object}        the source event, like TouchStart or MouseDown *
    startEvent  {Object}        contains the same properties as above,
                                but from the first touch. this is used to calculate
                                distances, touchTime, scaling etc

You can write your own gestures, you can find examples and documentation about this in gestures.js.


## Compatibility
|                                   | Tap | Double Tap | Hold | Drag | Transform |
|:----------------------------------|:----|:-----------|:-----|:-----|:----------|
| **BlackBerry**                                                                 |
| Playbook                          | X   | X          | X    | X    | X         |
| BlackBerry 10                     | X   | X          | X    | X    | X         |
|                                                                                |
| **iOS**                                                                        |
| iPhone/iPod iOS 6                 | X   | X          | X    | X    | X         |
| iPad/iPhone iOS 5                 | X   | X          | X    | X    | X         |
| iPhone iOS 4                      | X   | X          | X    | X    | X         |
|                                                                                |
| **Android 4**                                                                  |
| Default browser                   | X   | X          | X    | X    | X         |
| Chrome                            | X   | X          | X    | X    | X         |
| Opera                             | X   | X          | X    | X    | X         |
| Firefox                           | X   | X          | X    | X    | X         |
|                                                                                |
| **Android 3**                                                                  |
| Default browser                   | X   | X          | X    | X    | X         |
|                                                                                |
| **Android 2**                                                                  |
| Default browser                   | X   | X          | X    | X    |           |
| Firefox                           | X   | X          | X    | X    |           |
| Opera Mobile                      | X   | X          | X    | X    |           |
| Opera Mini                        | X   |            |      |      |           |
|                                                                                |
| **Others**                                                                     |
| Kindle Fire                       | X   | X          | X    | X    | X         |
| Nokia N900 - Firefox 1.1          | X   |            |      |      |           |
|                                                                                |
| **Windows**                                                                    |
| Internet Explorer 7               | X   | X          | X    | X    | X*        |
| Internet Explorer 8               | X   | X          | X    | X    | X*        |
| Internet Explorer 9               | X   | X          | X    | X    | X*        |
| Internet Explorer 10              | X   | X          | X    | X    | X*        |
|                                                                                |
| **OSX**                                                                        |
| Firefox                           | X   | X          | X    | X    | X*        |
| Opera                             | X   | X          | X    | X    | X*        |
| Chrome                            | X   | X          | X    | X    | X*        |
| Safari                            | X   | X          | X    | X    | X*        |


On a desktop browser the mouse can be used to simulate touch events with one finger.
On Android 2 (and 3?) doesn't support multi-touch events, so there's no transform callback on these Android versions.
Firefox 1.1 (Nokia N900) and Windows Phone 7.5 doesnt support touch events, and mouse events are badly supported.

Not all gestures are supported on every device. This matrix shows the support we have tested. This is ofcourse far from extensive.
If you've tested hammer.js on a different device, please let us know.

* Transform gesture is available on Windows and OSX with the hammer.fakemultitouch.js plugin.


## Todo
- Update website in gh-pages
- More demo's
- Measure speed difference of V1 with V2


## Further notes
Created by [Jorik Tangelder](http://twitter.com/jorikdelaporik) and developed further by everyone at [Eight Media](http://www.eight.nl/) in Arnhem, the Netherlands.

Add your feature suggestions and bug reports on [Github](http://github.com/eightmedia/hammer.js/issues).

We recommend listening to [this loop](http://soundcloud.com/eightmedia/hammerhammerhammer) while using hammer.js.
