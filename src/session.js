var incrementalSessionId = 0;

function Session(inst) {
    this.id = incrementalSessionId++;
    this.inst = inst;

    this.timeStamp = +new Date();

    // this may be used to store data from gestures
    this.data = {};

    // max 10 sessions in the history per instance
    inst.sessions.splice(9, 1);
};

/**
 * update
 * @param inputData
 */
Session.prototype.update = function(inputData) {
    this.inst.touchAction.update(inputData);
    this.inst.gestures.update(inputData);
};
