var incrementalSessionId = 0;

var Session = Hammer.Session = function(inst) {
    this.id = incrementalSessionId++;
    this.inst = inst;

    this.timeStamp = +new Date();

    // this may be used to store data from gestures
    this.data = {};

    // only max 10 sessions in the history per instance
    inst.sessions.splice(9, 1);
};

/**
 * update
 * @param inputData
 */
Session.prototype.update = function(inputData) {
    this.inst.touchAction.update(inputData);
    Gestures(this.inst, inputData, this);
};
