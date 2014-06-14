# Hammer.js, 2.0 development [![Build Status](https://travis-ci.org/EightMedia/hammer.js.svg?branch=2.0.x)](https://travis-ci.org/EightMedia/hammer.js/)

**Completely rewritten, with reusable gesture recognizers, and better support for the recent mobile browsers by
making use of the `touch-action` css property when possible. Also support for multiple Hammer instances the same
time, so multi-user became possible.**

## How to use
Hammer is still easy to use. Just create an instance and bind the events. By default it supports all the standard
gestures you would expect.

````js
var mc = Hammer(myElement);
mc.on("swipeleft swiperight", mySwipeHandler);
````

By default it supports the `tap`, `doubletap`, `pan`, `swipe`, `hold`, `pinch` and `rotate` gestures. The default
`touch-action` property is set to `pan-y`, so horizontal scrolling is being prevented, but vertical scrolling is
still possible.

### More control
You can setup your own set of recognizers for your instance. This requires a bit more code, but it gives you more
control and slightly better performance.

````js
var myOptions = {
    touchAction: 'none'
};
var mc = new Hammer.Manager(myElement, myOptions);

mc.add(new Hammer.Pan({ direction: Hammer.DIRECTION_HORIZONTAL | Hammer.DIRECTION_VERTICAL }));
mc.add(new Hammer.Tap({ event: 'quadrupletap', taps: 4 }));

mc.on("pan", handlePan);
mc.on("quadrupletap", handleTaps);
````

The example above creates an instance containing a `pan` and a `quadrupletap` gesture. The recognizer instances you
create a being executed in the order they are added, and only one can be recognized at the time.

If you want to recognize two gestures simultaneously, you can join these with the `join()` method. The example
below does this with the pinch and rotate recognizers, which will improve usability.

````js
var pinch = mc.add(new Hammer.Pinch());
var rotate = mc.add(new Hammer.Rotation());
pinch.recognizeWith(rotate); // recognize the pinch-rotation recognizers simultaneous
````

Now Hammer is able to run pinch and rotate the same time. You can also separate them with the `separate()` method on
the recognizer instance.

## The Touch-action property
Chrome 35+, IE10+ and soon FireFox, support the `touch-action` property. This property tells the browser how to
handle touches on an element. It improves the detection and experience of the gestures a lot, because it can prevent
scrolling of the page without any JavaScript has to be executed, which can be too late in some cases.

Hammer makes use of this property, and uses a fallback when needed. It is important to set this property to the
correct value when creating an instance. By default it tries to read the value from the element,
or it is set to `pan-y` when not found.

The values you can use are `auto`, `pan-y`, `pan-x` and `none`. When set to `auto` it doesnt prevent any scrolling,
and Hammer would run, but it might fail if you dont call `ev.preventDefault()` soon enough. This is not recommended!

`pan-x` and `pan-y` set what direction of panning of the browser should _allow_. This means that `pan-y` allows
vertical scrolling, and prevents horizontal scrolling so gestures are being recognized. The `none`
value prevents all scrolling, making it ideal for multi-touch gestures like pinching and rotating.

Below is a list of the available parameters for touch-action.

| Property  | Gestures              | Description           |
|-----------|-----------------------|-----------------------|
| `auto`    | tap, doubletap        | The browser will add the normal touch interactions which it supports. |
| `none`	| pinch, rotate         | No touch interactions will be handled by the browser. |
| `pan-x`	| panup, pandown, swipeup, swipedown | Only horizontal scrolling will be handled by the browser. |
| `pan-y`	| panleft, panright, swipeleft, swiperight | Only vertical scrolling will be handled by the browser. |

## API
The source code is well documented (JSDoc), you could figure out the rest of the API over there!

### Hammer.Manager(element, [options])
Create a Manager. This sets up the input event listeners, and sets the touch-action property for you on the element.

The `touchAction` option accepts the `auto`, `pan-y`, `pan-x` and `none` values, just like the css property. By default
 it tries to read the value from the element (set by you stylesheet), and if not found it is set to `pan-y`.

##### .enable(Boolean) and .destroy()
When disabled, it doesn't send any input events to the recognizers. Calling the destroy method unbinds all events and 
input events and makes the manager unusable.

##### .add(Recognizer), .get(Recognizer) and .remove(Recognizer)
Add a new `Recognizer` instance to the Manager. The order of adding is also the order of the recognizers being
executed. Just like the `get` method, it returns the added `Recognizer` instance.

The `get` and `remove` methods takes the event name (from a recognizer) or a recognizer instance as an argument.

##### .on(events, handler) and .off(events, [handler])
Listen to events triggered by the added recognizers, or remove the binded events. Accepts multiple events seperated
by a space.

### Hammer.Recognizer(options)
Every Recognizer extends from this class. Below are the only methods you would need. The options are different
for most of the recognizers, but all have the property `event` and `pointers`,

`event` is used as the triggered event (like `swipe` or `pan`), and as the lookup field when calling `Manager.get()`.
`pointers` is the amount of touches/pointers the recognizer requires.

##### .enable(Boolean)
When disabled, it doesn't send any input events to the recognizer. The recognizer is enabled by default. 

##### .recognizeWith(Recognizer) and .dontRecognizeWith(Recognizer)
Run the recognizer simultaneous with the given other recognizer. This is usable for like combining a pan with a
swipe at the end, or a pinch with the ability to rotate the target as well. It accepts a recognizer's event name or
it's instance as an argument.

## Further notes
Developed by [Jorik Tangelder](http://twitter.com/jorikdelaporik) in his spare time and at
[Eight Media](http://www.eight.nl/) in Arnhem, the Netherlands. It's recommended to listen to
[this loop](http://soundcloud.com/eightmedia/hammerhammerhammer) while using hammer.js.
