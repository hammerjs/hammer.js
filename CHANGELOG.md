# Changelog

### 1.1.0dev, 2014-04-07
- Added code docs, YUIdoc style
- Rewritten event core event to be more precise. Needs some more testing to become final. (I could use your help with this)
- Added EVENT_TOUCH and EVENT_RELEASE event types, for more control
- Added CHANGELOG.md!
- New gesture event: `gesture`. This is a lowlevel gesture which passes all data. Disabled by default.
- The setting `touchAction` changed from `none` to `pan-x pinch-zoom double-tap-zoom`.
- Dropped NO_MOUSEEVENTS check to be more future friendly.
