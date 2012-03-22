# Hammer.js 

## A javascript library for multi-touch gestures

> I told you, homeboy /
> You *CAN* touch this /
> Yeah, that's how we living and you know /
> You *CAN* touch this

Hammer.js is a javascript library (that depends on jQuery) that can be used to control gestures on touch devices. It supports the following gestures:

- Tap
- Double tap
- Hold
- Drag
- Transform

## Documentation
> So wave your hands in the air /
> Bust a few moves /
> Run your fingers through your hair

A step by step guide on how to use hammer.js:

* [Download the hammer javascript](https://github.com/EightMedia/hammer.js/zipball/master) or clone the latest version from our github repository:

```$ git clone git@github.com:eightmedia/hammer.js.git```

* Import jquery and import hammer.js in your project:
    
```<script src="https://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js"></script>
<script src="hammer.js"></script>```

* Hammertime! Bind hammer to a container element:

```var hammer = new Hammer("#container");```

Now, on every gesture that is performed on the container element, you'll receive a callback object with information on the gesture.

### The Hammer callback objects:

All gestures return:

- Event: The original jQuery event (targetElement, etc.).
- Position: An object with the x and y position of the gesture (e.g. the position of a tap and the center position of a transform).
- Touches: An array of touches, containing an object with the x and the y position for every finger.

Besides these, the Transform gesture returns:

- Scale: The distance between two fingers since the start of an event as a multiplier of the initial distance. The initial value is 1.0. If less than 1.0 the gesture is pinch close to zoom out. If greater than 1.0 the gesture is pinch open to zoom in.
- Rotation: A delta rotation since the start of an event in degrees where clockwise is positive and counter-clockwise is negative. The initial value is 0.0.

The Drag gesture also returns:

- Angle: The angle of the drag movement, where right is 0 degrees, left is -180 degrees, up is -90 degrees and down is 90 degrees. [This picture makes this approach somewhat clearer](http://paperjs.org/tutorials/geometry/vector-geometry/resources/Angles.gif)
- Direction: Based on the angle, we return a simplified direction, which can be either up, right, down or left.
- Distance: The distance of the drag in pixels.

In addition to this the Transform and Drag gestures return start and end events.

### Requirements and compatibility
Hammer.js requires jQuery for simple event binding and for the position of the container element.

Hammer.js has been tested on iPad1 with iOS5, iPhone4 with iOS5, Samsung Galaxy S with Android 2.3.3 and Google Chrome 17. On a desktop browser the mouse can be used to simulate touch events with one finger.
On Android 2 (and 3?) the default browser and Firefox 10 doesn't support multi-touch events, so there's no transform callback on Android.
Firefox 1.1 (Nokia N900) and Windows Phone 7.5 doesnt support touch events, and mouse events are badly supported.

Not all gestures are supported on every device. This matrix shows the support we have tested. This is ofcourse far from extensive. If you've tested hammer.js on a different device, please let us know.

| *Gesture/ Device* | iPad iOS5 | iPhone iOS5 | Android 2.2.3 | Firefox 10 on Android 2.2.3 | Windows Phone 7.5 | Nokia N900 (Firefox 1.1) | ? |
|:-----------|:--------:|:---------|:---------|:---------|:---------|:---------|:---------|
| Tap        | X        | X        | X        | X        | X        | X        | ?        |
| Hold       | X        | X        | X        | X        |          |          | ?        |
| Double Tap | X        | X        | X        | X        |          |          | ?        |
| Transform  | X        | X        |          |          |          |          | ?        |
| Drag       | X        | X        | X        | X        |          |          | ?        |

## Demo's
> While it's rollin', hold on /
> Pump a little bit and let 'em know it's goin' on /
> Like that, like that

We've created some demo's to show you the immense power of hammer.js:

### Basic demo
A simple demo that demonstrates that hammer.js works and is able to recognize gestures. We output the gestures that are recognized. [Check it out](http://eightmedia.github.com/hammer.js/demo2.html)

### Slideshow
A slideshow that uses hammer.js to switch slides. Note that the drag event in the slideshow is non-blocking for the scrolling of the page. [Check it out](http://eightmedia.github.com/hammer.js/slideshow.html)

### Scroll content
? [Check it out](http://eightmedia.github.com/hammer.js/scroll-content.html)

### Drag
? [Check it out](http://eightmedia.github.com/hammer.js/drag.html)

### Color traces (not finished yet)
We use hammer.js to generate beautiful traces with colorful balls. Balls! Upload multi-drag.html [Check it out](http://eightmedia.github.com/hammer.js/multi-drag.html)

### Lightbox (not finished yet)
We use hammer.js to close a lightbox by pinching it.

### Pinch to zoom (not finished yet)
We use hammer.js to zoom in and out on an image by pinching.

### Videoplayer / Google maps threshold (not finished yet)
We use hammer.js to differentiate between an intentional interaction with a videoplayer or a google maps element and i.e. a scroll gesture. Without this differentiation it's easy to get stuck in such an element, especially when it takes up a large part of your browser window.

## Further notes
Created by [J. Tangelder](http://twitter.com/jorikdelaporik) and developed further by everyone at [Eight Media](http://www.eight.nl/) in Arnhem, the Netherlands.

Add your feature suggestions and bug reports on [Github](http://github.com/eightmedia/hammer.js/issues).

We recommend listening to [this loop](http://soundcloud.com/eightmedia/hammerhammerhammer) while using hammer.js.