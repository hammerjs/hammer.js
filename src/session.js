var incrementalSessionId = 0;

var Session = Hammer.Session = function(inst) {
    this.id = incrementalSessionId++;
    this.inst = inst;

    /* this may be used to store data from gestures */
    this.data = {};
};

Session.prototype.update = function(inputData) {
    Gestures(this.inst, inputData, this);
};
