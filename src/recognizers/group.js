function RecognizerGroup(recognizers) {
    Recognizer.call(this, {});

    this.recognizers = recognizers;
}

inherit(RecognizerGroup, Recognizer, {
    setInstance: function(inst) {
        this.inst = inst;
        each(this.recognizers, function(recognizer) {
            recognizer.setInstance(inst);
        });
    },

    update: function(inputData) {
        if(!this.enabled) {
            this.state = STATE_FAILED;
            return;
        }

        var newState = STATE_POSSIBLE;
        each(this.recognizers, function(recognizer) {
            recognizer.update(inputData);
            if(recognizer.state < newState) {
                newState = recognizer.state;
            }
        }, this);
        this.state = newState;
    }
});
