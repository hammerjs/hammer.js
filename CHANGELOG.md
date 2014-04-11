# Changelog

### 1.1.0dev, 2014-04-07
- Added code docs, YUIdoc style
- Rewritten event core event to be more precise. Needs some more testing to become final. (I could use your help with this)
- Added `EVENT_TOUCH` and `EVENT_RELEASE` event types. These events are triggered inside Hammer to do actions when the touches change. This makes some gestures more precise.
- Added CHANGELOG.md!
- New gesture event: `gesture`. This is a lowlevel gesture which passes all data. Disabled by default.
- Dropped `NO_MOUSEEVENTS` check to be more future friendly. This still could be done by the `prevent_mouseevents` option, defined at the `touch` gesture.
- The gestures `touch` and `release` are now triggered on every new touch/release instead of start/end.
- Removed `interimDirection` and `interimAngle`, these are now moved to `direction` and `angle`.
- Changed the name of the option `stop_browser_behavior` to `behavior`.