# Changelog

### 1.1.0dev, 2014-04-07
- Rewritten event core event handler.
- Rewritten calculation of velocity and direction.
- Added `EVENT_TOUCH` and `EVENT_RELEASE` event types. These events are triggered inside Hammer to do actions when the touches change. This makes some gestures more precise.
- Added CHANGELOG.md!
- Added more unit tests.
- Added code docs, YUIdoc style.
- New gesture event: `gesture`. This is a lowlevel gesture which passes all data. Disabled by default.
- Dropped `NO_MOUSEEVENTS` check. This still could be done by the `prevent_mouseevents` option, defined at the `touch` gesture.
- The gestures `touch` and `release` are now triggered on every new touch/release instead of start/end.
- Removed `transform_within_instance`.
- Changed the name of the option `stop_browser_behavior` to `behavior`.
- Fixed support of the fakeMultitouch plugin for IE PointerEvents
- The Showtouches plugin doesn't require an IE check anymore.