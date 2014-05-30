function Manager() {
    this.enabled = true;

    this.session = {};
    this.recognizers = [];

    this.input = createInputInstance(this);
    this.touchAction = new TouchAction(this);
}

Manager.prototype = {
    enable: function() {
        this.enabled = true;
    },

    disable: function() {
        this.enabled = false;
    },

    /**
     * run the recognizers!
     * this is called by the inputHandler function
     * @param {Object} inputData
     */
    update: function(inputData) {
        if(!this.enabled) {
            return;
        }

        this.touchAction.update(inputData);

        var recognizer;
        var session = this.session;
        var curRecognizer = session.curRecognizer;

        // reset when the last recognizer is done, or this is a new session
        if(!curRecognizer || (curRecognizer && curRecognizer >= STATE_RECOGNIZED)) {
            curRecognizer = session.curRecognizer = null;
        }

        // we're in a active recognizer
        for(var i = 0; i < this.recognizers.length; i++) {
            recognizer = this.recognizers[i];

            if(!curRecognizer || recognizer == curRecognizer || recognizer.joins(curRecognizer)) {
                recognizer.update(inputData);
            }

            if(!curRecognizer && recognizer.state <= STATE_RECOGNIZED) {
                curRecognizer = session.curRecognizer = recognizer;
            }
        }
    },

    join: function(recognizers) {
        // make sure we have an array with instances
        for(var i = 0; i < recognizers.length; i++) {
            recognizers[i] = this.get(recognizers[i]);
        }

        each(recognizers, function(recognizer) {
            for(var i = 0; i < recognizers.length; i++) {
                if(recognizers[i] != recognizer) {
                    recognizer.join(recognizers[i]);
                }
            }
        }, this);
    },

    /**
     * add a recognizer to the instance
     * @param {Recognizer} recognizer
     * @returns {Recognizer}
     */
    add: function(recognizer) {
        this.recognizers.push(recognizer);
        recognizer.setInstance(this);
        return recognizer;
    },

    /**
     * get a recognizer by its event name
     * @param {Recognizer|String} recognizer
     * @returns {Recognizer|Null}
     */
    get: function(recognizer) {
        if(recognizer instanceof Recognizer) {
            return recognizer;
        }

        var recognizers = this.recognizers;
        for(var i = 0; i < recognizers.length; i++) {
            if(recognizers[i].options.event == recognizer) {
                return recognizers[i];
            }
        }
        return null;
    },

    /**
     * remove a recognizer
     * @param {Recognizer|String} recognizer
     * @returns {Recognizer|Null}
     */
    remove: function(recognizer) {
        recognizer = this.get(recognizer);

        var recognizers = this.recognizers;
        for(var i = 0; i < recognizers.length; i++) {
            if(recognizers[i] === recognizer) {
                return this.recognizers.splice(i, 1);
            }
        }
        return null;
    }
};
