/**
 * create an manager with a default set of recognizers
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Hammer(element, options) {
    options = options || {};
    var manager = new Manager(element, options);

    /**
     * setup recognizers
     * the defauls.recognizers contains an array like this;
     * [ RecognizerClass, options, recognizeWith ],
     * [ .... ]
     */
    var defaultRecognizers = manager.options.recognizers;
    if (defaultRecognizers) {
        each(defaultRecognizers, function(item) {
            var recognizer = manager.add(new (item[0])(item[1]));
            if (item[2]) {
                recognizer.recognizeWith(item[2]);
            }
        });
    }

    return manager;
}

Hammer.VERSION = '{{PKG_VERSION}}';

Hammer.defaults = {
    // when set to true, dom events are being triggered.
    // but this is slower and unused by simple implementations, so disabled by default.
    domEvents: false,

    // this value is used when a touch-action isn't defined on the element.style
    touchAction: TOUCH_ACTION_COMPUTE,

    enable: true,

    // default setup when calling Hammer()
    recognizers: [
        [RotateRecognizer, { enable: false }],
        [PinchRecognizer, { enable: false }, 'rotate'],
        [SwipeRecognizer,{ direction: DIRECTION_HORIZONTAL }],
        [PanRecognizer, { direction: DIRECTION_HORIZONTAL }, 'swipe'],
        [TapRecognizer],
        [TapRecognizer, { event: 'doubletap', taps: 2 }, 'tap'],
        [PressRecognizer]
    ],

    // with some style attributes you can improve the experience.
    cssProps: {
        // Disables text selection to improve the dragging gesture. When the value is `none` it also sets
        // `onselectstart=false` for IE9 on the element. Mainly for desktop browsers.
        userSelect: 'none',

        // Disable the Windows Phone grippers when pressing an element.
        touchSelect: 'none',

        // Disables the default callout shown when you touch and hold a touch target.
        // On iOS, when you touch and hold a touch target such as a link, Safari displays
        // a callout containing information about the link. This property allows you to disable that callout.
        touchCallout: 'none',

        // Specifies whether zooming is enabled. Used by IE10>
        contentZooming: 'none',

        // Specifies that an entire element should be draggable instead of its contents. Mainly for desktop browsers.
        userDrag: 'none',

        // Overrides the highlight color shown when the user taps a link or a JavaScript
        // clickable element in iOS. This property obeys the alpha value, if specified.
        tapHighlightColor: 'rgba(0,0,0,0)'
    }
};
