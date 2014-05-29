/**
 * a recognizer group can be created to let recognizers run simultaneous.
 * @param {Array} recognizers
 * @constructor
 */
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
        var recognizer;

        for(var i = 0; i < this.recognizers.length; i++) {
            recognizer = this.recognizers[i];
            recognizer.update(inputData);
            if(recognizer.state < newState) {
                newState = recognizer.state;
            }
        }

        this.state = newState;
    },

    // use the instance methods
    // they refer to this.recognizers
    add: Instance.prototype.add,
    remove: Instance.prototype.remove,
    get: Instance.prototype.get
});
