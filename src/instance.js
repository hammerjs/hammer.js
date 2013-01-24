function HammerInstance(el, options) {
    var self = this;

    this.element = el;
    this.options = Util.extend(hammer.defaults, options);

    // setup hammerJS window events
    setup();

    // start detection on touchstart
    Event.onTouch(el, hammer.TOUCH_START, function(ev) {
        Gesture.startDetect(self, ev);
    });
}


/**
 * trigger gesture event
 * @param   string      gesture
 * @param   object      ev
 * @return  {*}
 */
HammerInstance.prototype.trigger = function(gesture, ev) {
    ev.gesture = gesture;
    return Event.trigger(this.element, gesture, ev);
};

HammerInstance.prototype.on = function(gesture, callback) {
    return Event.on(this.element, gesture, callback);
};

HammerInstance.prototype.off = function(gesture, callback) {
    return Event.off(this.element, gesture, callback);
};