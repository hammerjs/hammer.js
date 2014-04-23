# Changelog

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
- Removed the options `transform_within_instance`, it wasn't a common use-case and could be easily fixed in the event callback.
- Renamed the option `stop_browser_behavior` to `behavior`.
- Fixed support of the fakeMultitouch plugin for IE PointerEvents.
- Improved performance of the showTouches plugin.
- The Showtouches plugin doesn't require an IE check anymore.