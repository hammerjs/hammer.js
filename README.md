# Hammer.js

## A javascript library for multi-touch gestures

> I told you, homeboy /
> You *CAN* touch this /
> Yeah, that's how we living and you know /
> You *CAN* touch this

Hammer.js is a javascript library that can be used to control gestures on touch devices. It supports the following gestures:

- Tap
- Double tap
- Hold
- Drag
- Transform (pinch)


## Demo's
> While it's rollin', hold on /
> Pump a little bit and let 'em know it's goin' on /
> Like that, like that

We've created some demo's to show you the immense power of hammer.js:

### Basic demo
A simple demo that demonstrates that hammer.js works and is able to recognize gestures. We output the gestures that are recognized. [Check it out](http://eightmedia.github.com/hammer.js/demo/)

### Slideshow
A slideshow that uses hammer.js to switch slides. Note that the drag event in the slideshow is non-blocking for the scrolling of the page. [Check it out](http://eightmedia.github.com/hammer.js/slideshow/)

### Scroll content
A touch-scrollable div. [Check it out](http://eightmedia.github.com/hammer.js/scroll/)

### Drag
Move boxes around. [Check it out](http://eightmedia.github.com/hammer.js/drag/)

### Color traces
We use hammer.js to generate beautiful traces with colorful balls. Balls! [Check it out](http://eightmedia.github.com/hammer.js/draw/)

### Pinch to zoom
We use hammer.js to zoom in and out on an image by pinching. [Check it out](http://eightmedia.github.com/hammer.js/zoom/)


## Documentation
> So wave your hands in the air /
> Bust a few moves /
> Run your fingers through your hair

A step by step guide on how to use hammer.js:

* [Download the hammer javascript](https://github.com/EightMedia/hammer.js/zipball/master) or clone the latest version from our github repository:

```$ git clone git@github.com:eightmedia/hammer.js.git```

* Import jquery and import hammer.js in your project:
    
```<script src="http://eightmedia.github.com/hammer.js/hammer.js"></script>```

* Hammertime! Bind hammer to a container element:

```var hammer = new Hammer(document.getElementById("container"));```

Now, on every gesture that is performed on the container element, you'll receive a callback object with information on the gesture.

    hammer.ondragstart = function(ev) { };
    hammer.ondrag = function(ev) { };
    hammer.ondragend = function(ev) { };

    hammer.ontap = function(ev) { };
    hammer.ondoubletap = function(ev) { };
    hammer.onhold = function(ev) { };

    hammer.ontransformstart = function(ev) { };
    hammer.ontransform = function(ev) { };
    hammer.ontransformend = function(ev) { };

A jQuery plugin is also available and can be found in this repos.

   ```<script src="http://eightmedia.github.com/hammer.js/jquery.hammer.js"></script>```

    $("#element")
       .hammer({
            // options...
       })
       .bind("tap", function(ev) {
            console.log(ev);
       });


[Brian Rinaldi](https://twitter.com/remotesynth) has written a blogpost about Hammer.js, it explains things a bit more and has a nice looking demo. [Read it here.](http://www.remotesynthesis.com/post.cfm/add-gesture-support-to-your-web-application-via-hammer-js)


### The Hammer callback objects:

All gestures return:

- originalEvent: The original DOM event.
- position: An object with the x and y position of the gesture (e.g. the position of a tap and the center position of a transform).
- touches: An array of touches, containing an object with the x and the y position for every finger.

Besides these, the Transform gesture returns:

- scale: The distance between two fingers since the start of an event as a multiplier of the initial distance. The initial value is 1.0. If less than 1.0 the gesture is pinch close to zoom out. If greater than 1.0 the gesture is pinch open to zoom in.
- rotation: A delta rotation since the start of an event in degrees where clockwise is positive and counter-clockwise is negative. The initial value is 0.0.

The Drag gesture also returns:

- angle: The angle of the drag movement, where right is 0 degrees, left is -180 degrees, up is -90 degrees and down is 90 degrees. [This picture makes this approach somewhat clearer](http://paperjs.org/tutorials/geometry/vector-geometry/resources/Angles.gif)
- direction: Based on the angle, we return a simplified direction, which can be either up, right, down or left.
- distance: The distance of the drag in pixels.
- distanceX: The distance on the X axis of the drag in pixels.
- distanceY: The distance on the Y axis of the drag in pixels.

In addition to this the Transform and Drag gestures return start and end events.


### Defaults
|                    | default |                           |
|:-----------------------------------|:--------------------------|-----------------|
| prevent_default    | false         | when true all default browser actions are blocked. For instance if you want to drag vertically, try setting this to true. |
| css_hacks          | true          | css userSelect, touchCallout, userDrag, tapHighlightColor are added |
| drag               | true          |                           |
| drag_vertical      | true          |                           |
| drag_horizontal    | true          |                           |
| drag_min_distance  | 20            | pixels                    | 
| transform          | true          |                           |
| scale_treshold     | 0.1           | how much scaling needs to be done before firing the transform event |                   
| rotation_treshold  | 15            | degrees before firing the transform event | 
| tap                | true          |                           |
| tap_double         | true          |                           |
| tap_max_interval   | 300           | ms                          |
| tap_double_distance:| 20           | pixels, distance between taps  |
| hold               | true          |                           |
| hold_timeout       | 500           | ms                          |


### Compatibility
|                                   | Tap | Double Tap | Hold | Drag | Transform |
|:----------------------------------|:----|:-----------|:-----|:-----|:----------|
| **Windows**                                                                    |
| Internet Explorer 8               | X   | X          | X    | X    |           |
| Internet Explorer 9               | X   | X          | X    | X    |           |
|                                                                                |
| **OSX**                                                                        |
| Firefox 11                        | X   | X          | X    | X    |           |
| Opera 11                          | X   | X          | X    | X    |           |
| Chrome 16                         | X   | X          | X    | X    |           |
| Safari 5                          | X   | X          | X    | X    |           |
|                                                                                |
| **iOS**                                                                        |
| iPad iOS 5                        | X   | X          | X    | X    | X         |
| iPhone iOS 5                      | X   | X          | X    | X    | X         |
|                                                                                |
| **Android 2.2.3**                                                              |
| Default browser                   | X   | X          | X    | X    |           |
| Firefox 10                        | X   | X          | X    | X    |           |
| Opera Mobile 12                   | X   | X          | X    | X    |           |
| Opera Mini 6.5                    | X   |            |      |      |           |
| Opera Mini 7.0                    | X   |            |      |      |           |
|                                                                                |
| **Others**                                                                     |
| Windows Phone 7.5                 | X   |            |      |      |           |
| Kindle Fire                       | X   | X          | X    | X    | X         |
| Nokia N900 - Firefox 1.1          | X   |            |      |      |           |

On a desktop browser the mouse can be used to simulate touch events with one finger.
On Android 2 (and 3?) the default browser and Firefox 10 doesn't support multi-touch events, so there's no transform callback on Android.
Firefox 1.1 (Nokia N900) and Windows Phone 7.5 doesnt support touch events, and mouse events are badly supported.

Not all gestures are supported on every device. This matrix shows the support we have tested. This is ofcourse far from extensive.
If you've tested hammer.js on a different device, please let us know.


## Further notes
Created by [Jorik Tangelder](http://twitter.com/jorikdelaporik) and developed further by everyone at [Eight Media](http://www.eight.nl/) in Arnhem, the Netherlands.

Add your feature suggestions and bug reports on [Github](http://github.com/eightmedia/hammer.js/issues).

We recommend listening to [this loop](http://soundcloud.com/eightmedia/hammerhammerhammer) while using hammer.js.