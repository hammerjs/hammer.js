/**
 * create an instance with a default set of recognizers
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Hammer(element, options) {
    var inst = new Instance(element, options);

    inst.addRecognizer(new RecognizerGroup([
        new RotationRecognizer(),
        new PinchRecognizer()
    ]));

    inst.addRecognizer(new RecognizerGroup([
        new PanRecognizer(),
        new SwipeRecognizer()
    ]));

    inst.addRecognizer(new TapRecognizer({ event: 'doubletap', taps: 2 }));
    inst.addRecognizer(new TapRecognizer());

    inst.addRecognizer(new LongPressRecognizer());

    return inst;
}

Hammer.version = '{{PKG_VERSION}}';
