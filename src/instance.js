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

    // merge options
    this.options = Hammer.util.extend(
        Hammer.util.extend({}, Hammer.defaults),
        options || {});

    // add some css to the element to prevent the browser from doing its native behavoir
    if(this.options.stop_browser_behavior) {
        this.stopBrowserBehavior();
    }

    // start detection on touchstart
    Hammer.event.onTouch(element, Hammer.TOUCH_START, function(ev) {
        Hammer.gesture.startDetect(self, ev);
    });

    // return instance
    return this;
};


Hammer.Instance.prototype = {
    stopBrowserBehavior: function stopBrowserBehavior() {
        var prop,
            vendors = ['webkit','moz','o',''],
            css = {
                "userSelect": "none",
                "touchCallout": "none",
                "touchAction": "none",
                "userDrag": "none",
                "tapHighlightColor": "rgba(0,0,0,0)"
            };

        for(var i = 0; i < vendors.length; i++) {
            for(var p in css) {
                if(css.hasOwnProperty(p)) {
                    prop = p;
                    if(vendors[i]) {
                        prop = vendors[i] + prop.substring(0, 1).toUpperCase() + prop.substring(1);
                    }
                    this.element.style[prop] = css[p];
                }
            }
        }

        return this;
    },

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