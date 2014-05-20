# Changelog

### 1.1.3, 2014-05-20
- Removed unused gesture handler check. See [#545](https://github.com/EightMedia/hammer.js/issues/545)
- Changed the default value of `behavior.touchAction` from `none` to `pan-y`, for improved default behavior in IE10> and Chrome35>.
It makes the element less blocking and improves the detection of horizontal swipes. See the wiki for more details.

### 1.1.2, 2014-04-25
- Bring back the `NO_MOUSEEVENTS` check. Just has better support this way. It is used to disable binding to mouseevents on most mobile browsers.
- Pen support for pointerEvents
- Fixes some pointerEvent support issues
- Disables gestures on right mousebutton.
- Added `utils.setPrefixedCss` to set prefixed css properties.

### 1.1.1, 2014-04-23
- All vars and options renamed to be camelCased for more consistency in the code. Options are still allowed to be set with underscores when creating an instance.
- Codestyle changes, and a grunt task that keeps everything the same CS.

### 1.1.0, 2014-04-23
- Rewritten event core event handler. Fixes some issues with the last event data, and more triggers.
- Added `EVENT_TOUCH` and `EVENT_RELEASE` event types. These events are triggered inside Hammer when the touches change. This makes some gestures more precise and gives you more control.
- Refactored the calculation of velocity and interimDirection/Angle.
- Refactored some gestures.
- Added CHANGELOG.md!
- Added more unit tests.
- Added code docs, YUIdoc style.
- New gesture event: `gesture`. This is a lowlevel gesture which passes all data. Disabled by default.
- Dropped `NO_MOUSEEVENTS` check. This still could be done by the `prevent_mouseevents` option, defined at the `touch` gesture.
- The gestures `touch` and `release` are now triggered on every new touch/release instead of start/end.
- Removed the option `transform_within_instance`, it wasn't a common use-case and could be easily fixed in the event callback.
- Removed the option `transform_always_block` since it did the same as the `prevent_default` option.
- Renamed the option `stop_browser_behavior` to `behavior`.
- Fixed support of the fakeMultitouch plugin for IE PointerEvents.
- Improved performance of the showTouches plugin.
- The Showtouches plugin doesn't require an IE check anymore.
