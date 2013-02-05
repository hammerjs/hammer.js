# Hammer.js v2
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
- Windows8 has touch AND mouse, so pointer events needs to be used.
- Did I mentioned the code was inefficient? Now a Hammer instance is light, and only contains the methods it should.


## New features in v2

- DOM Events
- Debug plugins
- Custom gestures api
- jQuery plugin with events delegation (the on/off methods) available
- Efficient code, lower memory usage
- IE8 and older compatibility with jQuery plugin


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
| Firefox 10                        | X   | X          | X    | X    |           |
| Opera Mobile 12                   | X   | X          | X    | X    |           |
| Opera Mini 6.5                    | X   |            |      |      |           |
| Opera Mini 7.0                    | X   |            |      |      |           |
|                                                                                |
| **Windows Phone**                                                              |
| Windows Phone 8                   | X   | X          | X    | X    |           |
| Windows Phone 7.5                 | X   |            |      |      |           |
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

Transform gesture is available on Windows and OSX with the hammer.fakemultitouch.js plugin.


## Todo
- Better code documentation, JSDOC?
- Add how to use info
- ~~Documentation about custom gestures~~
- Test on devices
- Fix demo's
- ~~Explain why the rewrite~~
- Measure speed difference of V1 with V2
- Write Unit tests?
- ~~Write jQuery plugin~~
- ~~Write Debug tool?~~
- ~~Shift key multitouch on desktop~~
- Update website in gh-pages
- ~~Still not compatible with IE8 and older, should fix this?~~


## Further notes
Created by [Jorik Tangelder](http://twitter.com/jorikdelaporik) and developed further by everyone at [Eight Media](http://www.eight.nl/) in Arnhem, the Netherlands.

Add your feature suggestions and bug reports on [Github](http://github.com/eightmedia/hammer.js/issues).

We recommend listening to [this loop](http://soundcloud.com/eightmedia/hammerhammerhammer) while using hammer.js.
