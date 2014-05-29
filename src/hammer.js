/**
 * create an instance with a default set of recognizers
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Hammer(element, options) {
    options = options || {};
    var inst = new Instance(element, options);

    inst.add(new RecognizerGroup([
        new RotationRecognizer(options.rotation),
        new PinchRecognizer(options.pinch)
    ]));

    inst.add(new RecognizerGroup([
        new PanRecognizer(options.pan),
        new SwipeRecognizer(options.swipe)
    ]));

    options.doubleTap = merge(options.doubleTap || {}, { event: 'doubletap', taps: 2 });
    inst.add(new TapRecognizer(options.doubleTap));
    inst.add(new TapRecognizer(options.tap));

    inst.add(new LongPressRecognizer(options.longPress));

    return inst;
}

Hammer.version = '{{PKG_VERSION}}';
