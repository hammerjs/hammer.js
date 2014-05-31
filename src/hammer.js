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
     * [ RecognizerClass, options, join ],
     * [ .... ]
     */
    each(Hammer.defaults.recognizers, function(item) {
        var recognizer = manager.add(new (item[0])(item[1]));
        if(item[2]) {
            recognizer.join(item[2]);
        }
    });

    return manager;
}

Hammer.version = '{{PKG_VERSION}}';

Hammer.defaults = {
    touchAction: 'pan-y',
    domEvents: false,
    recognizers: [
        [RotationRecognizer],
        [PinchRecognizer, null, 'rotate'],
        [PanRecognizer],
        [SwipeRecognizer, null, 'pan'],
        [TapRecognizer, { event: 'doubletap', taps: 2 }],
        [TapRecognizer],
        [HoldRecognizer]
    ]
};
