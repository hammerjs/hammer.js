function Gestures(/*inst, inputData, session*/) {
    for(var name in Gestures) {
        var gesture = Gestures[name];
        if(gesture.handler) {
            gesture.handler.apply(gesture, arguments);
        }
    }
}
