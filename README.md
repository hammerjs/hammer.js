# Hammer.js, 2.0 development [![Build Status](https://travis-ci.org/EightMedia/hammer.js.svg?branch=2.0.x)](https://travis-ci.org/EightMedia/hammer.js/)

**Completely rewritten, with reusable gesture recognizers, and better support for the recent mobile browsers by
making use of the `touch-action` css property when possible. Also support for multiple Hammer instances the same
time, so multi-user became possible.**

## Getting Started
Hammer is still easy to use. Just create an instance and bind the events. By default it supports all the standard
gestures you would expect.

````js
var mc = Hammer(myElement);
mc.on("swipeleft swiperight", mySwipeHandler);
````

By default it adds the `tap`, `doubletap` and `press`, horizontal `pan` and `swipe`, and the multi-touch `pinch` and 
`rotate` recognizers. The ppinch and rotate recognizers are disabled by default because they would make the element 
blocking, but you can enable them by calling `mc.get('pinch').set('enable', true')`

Also the viewport meta tag is recommended, it gives more control back to the webpage by disableing the 
doubletap/pinch zoom. More recent browsers that support the touch-action property don't require this.

````html
<meta name="viewport" content="user-scalable=no, width=device-width, initial-scale=1, maximum-scale=1">
````

### More control
You can setup your own set of recognizers for your instance. This requires a bit more code, but it gives you more
control and slightly better performance.

````js
var myOptions = { };
var mc = new Hammer.Manager(myElement, myOptions);

mc.add(new Hammer.Pan({ direction: Hammer.DIRECTION_HORIZONTAL | Hammer.DIRECTION_VERTICAL }));
mc.add(new Hammer.Tap({ event: 'quadrupletap', taps: 4 }));

mc.on("pan", handlePan);
mc.on("quadrupletap", handleTaps);
````

The example above creates an instance containing a `pan` and a `quadrupletap` gesture. The recognizer instances you
create a being executed in the order they are added, and only one can be recognized at the time.

#### Simultaneous recognizing
If you want to recognize two gestures simultaneously, you can use the the `recognizeWith()` method. The example
below does this with the pinch and rotate recognizers, which will improve usability.

````js
var pinch = new Hammer.Pinch();
var rotate = new Hammer.Rotation();

pinch.recognizeWith(rotate); // recognize the pinch-rotation recognizers simultaneous
````

Now Hammer is able to run pinch and rotate the same time. You can also separate them with the `dropRecognizeWith()` method on
the recognizer instance.

#### Require failure of an other recognizer
With the method `requireFailure()` you can let a recognizer require the failure of an other recognizer before recognizing.
This could become useful when you want to nest two gestures, like pan-horizontal and pan-vertical. Once pan-horizontal is being recognized, the pan-vertical would be passed. 

````js
var horizontal = new Hammer.Pan({ event: 'panh', direction: Hammer.DIRECTION_HORIZONTAL });
var vertical = new Hammer.Pan({ event: 'panv', direction: Hammer.DIRECTION_VERTICAL });

horizontal.requireFailure(vertical);
verical.requireFailure(horizontal);
````

Removing the dependency could be done with the `dropRequireFailure()` method.

## The Touch-action property
Chrome 35+, IE10+ and soon FireFox, support the `touch-action` property. This property tells the browser how to
handle touches on an element. It improves the detection and experience of the gestures a lot, because it can prevent
scrolling of the page without any JavaScript has to be executed, which can be too late in some cases.
Hammer uses a fallback for this property when needed, so it is working with older browsers too.

By default it sets a value based on the recognizer settings. You can overwrite this by giving the option `touchAction`
to the Manager.

When you set the touchAction to `auto` it doesnt prevent any defaults, and Hammer would probably break. You have to 
call `preventDefault` manually to fix this. You should only use this if you know what you're doing.

### Preferred touch-action values per gesture
If you _do_ want to set your own value, then the table below should help you a bit...

| Gesture | Least restrictive touch-action value  |
|---------|---------------------------------------|
| press   | auto               |
| tap     | auto               |
| multitap | manipulation      |
| vertical pan/swipe | pan-x   |
| horizontal pan/swipe | pan-y |
| rotate  | pan-x pan-y        |
| pinch   | pan-x pan-y        |

# API
The source code is well documented (JSDoc), you could figure out the rest of the API over there!

### Hammer(HTMLElement, [options])
Creates a Manager instance with a default set of recognizers and returns the manager instance. The default set 
contains `tap`, `doubletap`, `pan`, `swipe`, `press`, `pinch` and `rotate` recognizer instances.

### Hammer.Manager(HTMLElement, [options])
Create a Manager. This sets up the input event listeners, and sets the touch-action property for you on the element.

The `touchAction` option accepts the `auto`, `pan-y`, `pan-x` and `none` values, just like the css property. By default
it is set to `compute`, which computes the correct touchAction property based on the added recognizers. 
 
| Option        | Default | Description                   |
|---------------|---------|-------------------------------|
| touchAction   |         | accepts the `compute`, `auto`, `pan-y`, `pan-x` and `none` values. Default is `compute`. |
| domEvents     | false   | this let's hammer also fire domEvents. |
| enable        | true    | boolean, or an function that should return a boolean which is. |

##### .add(Recognizer), .get(Recognizer) and .remove(Recognizer)
Add a new `Recognizer` instance to the Manager. The order of adding is also the order of the recognizers being
executed. Just like the `get` method, it returns the added `Recognizer` instance.

The `get` and `remove` methods takes the event name (from a recognizer) or a recognizer instance as an argument.

##### .on(events, handler) and .off(events, [handler])
Listen to events triggered by the added recognizers, or remove the binded events. Accepts multiple events seperated
by a space.

##### .destroy()
Unbinds all events and input events and makes the manager unusable. It does NOT unbind any domEvent listeners.


### Hammer.Recognizer(options)
Every Recognizer extends from this class. All recognizers also have the option `enable`, 
which is a boolean value or a callback function to enable/disable the recognizer on the fly.

##### .recognizeWith(otherRecognizer) and .dropRecognizeWith(otherRecognizer)
Run the recognizer simultaneous with the given other recognizer, in both directions. This is usable for like 
combining a pan with a swipe at the end, or a pinch with the ability to rotate the target as well. 

##### .requireFailure(otherRecognizer) and .dropRequireFailure(otherRecognizer)
Run the recognizer only when the other recognizer fails.


## Options per recognizer
#### Hammer.Press(options)
| Option    | Default  | Description       |
|-----------|----------|-------------------|
| event     | press    | Name of the event. |
| pointers  | 1        | Required pointers. |
| threshold | 10       | Minimal movement that is allowed while pressing. |
| time      | 500      | Minimal press time. |

#### Hammer.Pan(options)
| Option    | Default  | Description       |
|-----------|----------|-------------------|
| event     | pan      | Name of the event. |
| pointers  | 1        | Required pointers. 0 for all pointers. |
| threshold | 10       | Minimal pan distance required before recognizing. |
| direction | DIRECTION_ALL | Direction of the panning. |

#### Hammer.Pinch(options)
| Option    | Default  | Description       |
|-----------|----------|-------------------|
| event     | pinch    | Name of the event. |
| pointers  | 2        | Required pointers, with a minimal of 2. |
| threshold | 0        | Minimal scale before recognizing. |

#### Hammer.Rotate(options)
| Option    | Default  | Description       |
|-----------|----------|-------------------|
| event     | rotate   | Name of the event. |
| pointers  | 2        | Required pointers, with a minimal of 2. |
| threshold | 0        | Minimal rotation before recognizing. |

#### Hammer.Swipe(options)
| Option    | Default  | Description       |
|-----------|----------|-------------------|
| event     | swipe    | Name of the event. |
| pointers  | 1        | Required pointers. |
| distance  | 10       | Minimal distance required before recognizing. |
| velocity  | 0.65     | Minimal velocity required before recognizing, unit is in px per ms. |

#### Hammer.Tap(options)
| Option    | Default  | Description       |
|-----------|----------|-------------------|
| event     | swipe    | Name of the event. |
| pointers  | 1        | Required pointers. |
| taps      | 1        | Amount of taps required. |
| interval  | 300      | Maximum time between multiple taps. |
| time      | 250      | Maximum press time. |
| movementBetween | 10 | The maximum distance between multiple taps. |
| movementWhile | 2    | While doing a tap some small movement is allowed. |



## Further notes
Developed by [Jorik Tangelder](http://twitter.com/jorikdelaporik) in his spare time and at
[Eight Media](http://www.eight.nl/) in Arnhem, the Netherlands. It's recommended to listen to
[this loop](http://soundcloud.com/eightmedia/hammerhammerhammer) while using hammer.js.
