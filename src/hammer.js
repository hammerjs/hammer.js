/**
 * create an instance with a default set of recognizers
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Hammer(element, options) {
    options = options || {};
    var inst = new Instance(element, options);

    inst.use(new RecognizerGroup([
        new RotationRecognizer(options.rotation),
        new PinchRecognizer(options.pinch)
    ]));

    inst.use(new RecognizerGroup([
        new PanRecognizer(options.pan),
        new SwipeRecognizer(options.swipe)
    ]));

    options.doubleTap = merge(options.doubleTap || {}, { event: 'doubletap', taps: 2 });
    inst.use(new TapRecognizer(options.doubleTap));
    inst.use(new TapRecognizer(options.tap));

    inst.use(new LongPressRecognizer(options.longPress));

    return inst;
}

Hammer.version = '{{PKG_VERSION}}';
