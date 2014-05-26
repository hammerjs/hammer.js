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

        var session = this.session;

        if(inputData.isFirst) {
            session.curRecognizer = null;
        }

        each(this.recognizers, function(recognizer) {

            if(!session.curRecognizer || session.curRecognizer == recognizer) {
                recognizer.update(inputData);

                if(recognizer.state <= STATE_RECOGNIZED) {
                    session.curRecognizer = recognizer;
                } else {
                    session.curRecognizer = null;
                }
            }
        });
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
        // create DOM event
        var event = document.createEvent('Event');
        event.initEvent(gesture, true, true);
        event.gesture = eventData;

        console.log(gesture);

        this.element.dispatchEvent(event);
    }
};
