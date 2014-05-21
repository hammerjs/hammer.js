function Hammer(element, options) {
    // create instance
    return new Instance(element, options);
}

var MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android|silk/i;

var SUPPORT_POINTEREVENTS = window.PointerEvent;
var SUPPORT_TOUCHEVENTS = ("ontouchstart" in window);
var SUPPORT_ONLY_TOUCHEVENTS = SUPPORT_TOUCHEVENTS && MOBILE_REGEX.test(navigator.userAgent);
