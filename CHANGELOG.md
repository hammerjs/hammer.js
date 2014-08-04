# Changelog

### 2.0.3 dev
- Manager.set fixes. 
- Fix requireFailure() call in Manager.options.recognizers. 

### 2.0.2, 2014-07-26
- Improved mouse and pointer-events input, now able to move outside the window.
- Added the export name (`Hammer`) as an argument to the wrapper.
- Add the option *experimental* `inputTarget` to change the element that receives the events.
- Improved performance when only one touch being active.
- Fixed the jumping deltaXY bug when going from single to multi-touch.
- Improved velocity calculations.

### 2.0.1, 2014-07-15
- Fix issue when no document.body is available
- Added pressup event for the press recognizer
- Removed alternative for Object.create

### 2.0.0, 2014-07-11
- Full rewrite of the library.
