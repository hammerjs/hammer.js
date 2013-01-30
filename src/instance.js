/**
 * create new hammer instance
 * all methods should return the instance itself, so it is chainable.
 * @param   {HTMLElement}   element
 * @param   {Object}        [options={}]
 * @return  {Object}        instance
 */
Hammer.Instance = function(element, options) {
    var self = this;

    // setup HammerJS window events and register all gestures
    // this also sets up the default options
    setup();

    this.element = element;
    this._events = {};

    // merge options
    this.options = Hammer.utils.extend(
        Hammer.utils.extend({}, Hammer.defaults),
        options || {});

    // add some css to the element to prevent the browser from doing its native behavoir
    if(this.options.stop_browser_behavior) {
        Hammer.utils.stopBrowserBehavior(this);
    }

    // start detection on touchstart
    Hammer.event.onTouch(element, Hammer.TOUCH_START, function(ev) {
        return Hammer.gesture.startDetect(self, ev);
    });

    // return instance
    return this;
};


Hammer.Instance.prototype = {
    /**
     * these event methods are based on MicroEvent
     * the on, off and trigger event are only used by the inst
     * https://github.com/jeromeetienne/microevent.js
     *
     * bind events to the instance
     * @param   string      gestures
     * @param   callback    callback
     * @return  {*}
     */
    on: function onEvent(gestures, handler){
        var ev, t;
        gestures = gestures.split(" ");
        for(t=0; t<gestures.length; t++) {
            ev = gestures[t];
            this._events[ev] = this._events[ev]	|| [];
            this._events[ev].push(handler);
        }
    },


    /**
     * unbind events to the instance
     * @param   string      gestures
     * @param   callback    callback
     * @return  {*}
     */
    off: function offEvent(gestures, handler){
        var ev, t;
        gestures = gestures.split(" ");
        for(t=0; t<gestures.length; t++) {
            ev = gestures[t];
            if(ev in this._events === false) {
                return;
            }
            this._events[ev].splice(this._events[ev].indexOf(handler), 1);
        }
    },

    /**
     * trigger gesture event
     * @param   string      type
     * @param   object      ev
     * @return  {*}
     */
    trigger: function triggerEvent(gesture, data){
        data.gesture = gesture;

        if(gesture in this._events === false) {
            return;
        }
        for(var i = 0; i < this._events[gesture].length; i++){
            this._events[gesture][i].call(this, data);
        }
    }
};