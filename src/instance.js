/**
 * create new hammer instance
 * @param   {HTMLElement}   element
 * @param   {Object}        [options={}]
 * @return  {Object}        instance
 */
Hammer.Instance = function(element, options) {
    var self = this;

    this.element = element;
    this.options = Hammer.util.extend(Hammer.defaults, options || {});

    // setup HammerJS window events
    setup();

    // start detection on touchstart
    Hammer.event.onTouch(element, Hammer.TOUCH_START, function(ev) {
        Hammer.gesture.startDetect(self, ev);
    });

    // return instance
    return this;
};


Hammer.Instance.prototype = {
    /**
     * trigger gesture event
     * @param   string      gesture
     * @param   object      ev
     * @return  {*}
     */
    trigger: function triggerInstance(gesture, ev) {
        // put the gesture name in the event data
        ev.gesture = gesture;
        Hammer.event.trigger(this, gesture, ev);
        return this;
    },


    /**
     * bind events to the instance
     * @param   string      gestures
     * @param   callback    callback
     * @return  {*}
     */
    on: function onInstance(gesture, handler) {
        Hammer.event.on(this, gesture, handler);
        return this;
    },


    /**
     * unbind events to the instance
     * @param   string      gestures
     * @param   callback    callback
     * @return  {*}
     */
    off: function offInstance(gesture, handler) {
        Hammer.event.off(this, gesture, handler);
        return this;
    }
};