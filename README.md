# Full rewrite of Hammer.JS.

http://eightmedia.github.com/hammer.js/v2/
Lighter, smaller and more open, trigger DOM events, grunt, and custom gestures possible.

It needs some testing on Windows8 with touch/mouse. I've added support for it, but am not able to test it...


## Why the rewrite

- The previous Hammer.js became old, and too much of a hobby project: Inefficient code, bad documentation.
- It wasn't possible to add custom gestures, or change anything about the (inner) working of the gestures.
- It needed DOM events, to use with event event delegation.
- Windows8 has touch AND mouse, so pointer events needs to be used.
- Did I mentioned the code was inefficient? Now a Hammer instance is light, and only contains the methods it should.


## Todo

- Better code documentation, JSDOC?
- Better readme
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
- Still not compatible with IE8 and older, should fix this?
