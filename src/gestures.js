function Gestures(inst) {
    this.inst = inst;
}

/**
 * update
 * @param inputData
 */
Gestures.prototype.update = function(inputData) {
    for(var name in Gestures) {
        var gesture = Gestures[name];
        if(gesture.handler) {
            gesture.handler.call(gesture, this.inst, inputData);
        }
    }
};
