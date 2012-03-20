# Hammer.js 

Hammer.js is a javascript object that can be used to control gestures on touch devices.

> I told you, homeboy /
> You *CAN* touch this /
> Yeah, that's how we living and you know /
> You *CAN* touch this

Hammer.js supports the following gestures:

- Tap
- Double tap
- Hold
- Drag
- Transform

## Demo's
We've created some demo's to show you the power of hammer.js.

> While it's rollin', hold on /
> Pump a little bit and let 'em know it's goin' on /
> Like that, like that

### Basic Demo
A very simple demo that demonstrates that hammer.js works and is able to recognize gestures. We output the gestures that are recognized.
/ Insert link here /

### Slideshow
A simple slideshow that uses hammer to switch slides. Note that the drag event in the slideshow is non-blocking for the scrolling of the page.
/ Insert link here /

### Zoom and Scroll
We use hammer to zoom in on an image by pinching and scrolling it by dragging.
/ Insert link here /

### Videoplayer / Google maps threshold
/ Insert explanation and link here /

### Pagination
Unsure whether we'll finish this
/ Insert explanation and link here /

### Lightbox
Unsure whether we'll finish this
/ Insert explanation and link here /

### Scrub video
Unsure whether we'll finish this
/ Insert explanation and link here /

## Documentation

> So wave your hands in the air /
> Bust a few moves /
> Run your fingers through your hair

1. Download or clone the hammer javascript -> eightmedia.github.com
2. Import jquery
3. Import hammer.js
4. Hammertime!

### Binding to a container element:

Code example.

### The Hammer callback object:

Tap, Hold and Double Tap events return:

- Event
- Position

Transform event returns:

- Event
- Position
- Scale
- Rotation

Drag event returns:

- Event
- Position
- Direction
- Distance
- Angle

Something about start and end events?

### More code examples

Are there any?

### Requirements and compatibility
Hammer.js requires jQuery for simple event binding and for the position of the container element.

Hammer.js has been tested on iPad1 with iOS5, iPhone4 with iOS5, Samsung Galaxy S with Android 2.3.3 and Google Chrome 17. On a desktop browser the mouse can be used to simulate touch events with one finger. On Android 2 (and 3?) the default browser doesn't support multi-touch events, so there's no transform callback on Android.

Not all gestures are supported on every device. This support matrix shows the support we have tested. Note that this is not extensive. If you've tested hammer.js on a different device, please let us know.

| *Gesture/ Device* | iPad iOS5 | iPhone iOS5 | Android 2.2.3 |          |
|:-----------|:---------|:---------|:---------|:---------|
| Tap        |          |          |          |          |
| Hold       |          |          |          |          |
| Double Tap |          |          |          |          |
| Transform  |          |          |    X      |          |
| Drag       |          |          |          |          |

## Further notes
Created by [J. Tangelder] and developed furher by everyone  at [Eight Media] in Arnhem.

Add your feature suggestions and bug reports on [Github]

We recommend listening to [this loop] while using hammer.js.


  [eight media]: http://www.eight.nl/
  [j. tangelder]: http://twitter.com/jorikdelaporik
  [github]: http://github.com/jtangelder/...
  [this loop]: http://soundcloud.com/eightmedia/ace-of-speights

