function Gestures(/*inst, inputData, session*/) {
    for(var key in Gestures) {
        var gesture = Gestures[key];
        if(gesture.handler) {
            gesture.handler.apply(gesture, arguments);
        }
    }
}
