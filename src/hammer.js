/**
 * create an instance with a default set of recognizers
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Hammer(element, options) {
    options = options || {};
    var inst = new Instance(element, options);

    var rotate = inst.add(new RotationRecognizer(options.rotation));
    var pinch = inst.add(new PinchRecognizer(options.pinch));
    rotate.join(pinch);

    var pan = inst.add(new PanRecognizer(options.pan));
    var swipe = inst.add(new SwipeRecognizer(options.swipe));
    pan.join(swipe);

    options.doubleTap = merge(options.doubleTap || {}, { event: 'doubletap', taps: 2 });
    inst.add(new TapRecognizer(options.doubleTap));
    inst.add(new TapRecognizer(options.tap));

    inst.add(new LongPressRecognizer(options.longPress));

    return inst;
}

Hammer.version = '{{PKG_VERSION}}';
