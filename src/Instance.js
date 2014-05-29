Hammer.defaults = {
    touchAction: 'pan-y'
};

/**
 * Hammer instance for an element
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Instance(element, options) {
    this.element = element;
    this.options = merge(options || {}, Hammer.defaults);

    this.session = {};
    this.recognizers = [];

    this.input = createInputInstance(this);
    this.touchAction = new TouchAction(this);
}

Instance.prototype = {
    update: function(inputData) {
        this.touchAction.update(inputData);

        var recognizer;
        var session = this.session;
        var curRecognizer = session.curRecognizer;

        // reset when the last recognizer is done, or this is a new session
        if(!curRecognizer || (curRecognizer && curRecognizer >= STATE_RECOGNIZED)) {
            curRecognizer = session.curRecognizer = null;
        }

        // we're in a active recognizer
        if(curRecognizer) {
            curRecognizer.update(inputData);
        } else {
            for(var i = 0; i < this.recognizers.length; i++) {
                recognizer = this.recognizers[i];
                recognizer.update(inputData);

                if(recognizer.state <= STATE_RECOGNIZED) {
                    curRecognizer = session.curRecognizer = recognizer;
                    return;
                }
            }
        }
    },

    addRecognizer: function(recognizerInst) {
        this.recognizers.push(recognizerInst);
        recognizerInst.setInstance(this);
    },

    /**
     * destroy the instance
     */
    destroy: function() {
        this.session = {};
        this.input.destroy();
        this.element = null;
    },

    /**
     * @param {String} gesture
     * @param {Object} eventData
     */
    trigger : function(gesture, eventData) {
        var event = document.createEvent('Event');
        event.initEvent(gesture, true, true);
        event.gesture = eventData;

        this.element.dispatchEvent(event);
    }
};
