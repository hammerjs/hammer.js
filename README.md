Hammer.js
=========

Object to control the gestures on touch devices. Supports the following gestures:

  - Tap
  - Double tap
  - Hold
  - Drag
  - Transform (scale and rotation)

Tested on iPad1 with iOS5, iPhone4 with iOS5, Samsung Galaxy S with Android 2.3.3 and Google Chrome 17. Requires jQuery for some simple event binding and position of the container element.
On a desktop browser the mouse can be used to simulate touch events with one finger. On Android 2 (and 3?) the default browser doesnt support multi-touch events, so no transform callback.

Sample usage
------

<pre>
  // these are the default options
  var options = {
      drag: true,
      drag_vertical: false,
      drag_horizontal: true,
      drag_min_distance: 20,
      drag_threshold: 70,		// how much the sliding can be out of the exact direction

      transform: true,    // pinch zoom and rotation

      tap: true,
      tap_double: true,
      tap_max_interval: 500,
 
      hold: true,
      hold_timeout: 500
  };
 
  // create an instance
  var hammer = new Hammer("#hitarea", options); 

  // event callbacks
  hammer.onHold = function() { console.log('hold', arguments); };

  hammer.onTap = function() { console.log('tap', arguments); };
  hammer.onDoubleTap = function() { console.log('double tap', arguments); };

  hammer.onTransformStart = function() { console.log('transform start', arguments); };
  hammer.onTransform = function() { console.log('transform', arguments); };

  hammer.onDragStart = function() { console.log('drag start', arguments); };
  hammer.onDrag = function() { console.log('drag', arguments); };
  hammer.onDragEnd = function() { console.log('drag end', arguments); };

</pre>


To Do
-----

  - Fix the demo page and more samples with UI elements (like sliders..)
  - Improve event callbacks with more arguments
  - Device testing
  - Clean up the code
  - Better documentation..!

-----

Created by [J. Tangelder] at [Eight Media] in Arnhem.

  [eight media]: http://www.eight.nl/
  [j. tangelder]: http://twitter.com/jorikdelaporik