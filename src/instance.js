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
    trigger: function(gesture, ev) {
        // put the gesture name in the event data
        ev.gesture = gesture;
        return Hammer.event.trigger(this.element, gesture, ev);
    },


    /**
     * bind events to the instance
     * @param   string      gestures
     * @param   callback    callback
     * @return  {*}
     */
    on: function(gesture, handler) {
        return Hammer.event.on(this.element, gesture, handler);
    },


    /**
     * unbind events to the instance
     * @param   string      gestures
     * @param   callback    callback
     * @return  {*}
     */
    off: function(gesture, handler) {
        return Hammer.event.off(this.element, gesture, handler);
    }
};