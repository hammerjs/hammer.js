function Gestures(inst) {
    this.inst = inst;

    this.recognizers = {};
    each(registeredRecognizers, function(r) {
        var recInst = new Recognizer(r.name, r.options, r.test, r.handler);
        recInst.inst = inst;
        recInst.gestures = this;
        this.recognizers[r.name] = recInst;
    }, this);
}

/**
 * update
 * @param {Object} inputData
 */
Gestures.prototype.update = function(inputData) {
    each(this.recognizers, function(recognizer) {
        recognizer.update(inputData);
    });
};

Gestures.prototype.preventRecognizers = function(recognizers) {
    // todo
};
