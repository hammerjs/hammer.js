/**
 * drag gesture
 */
registerGesture({
    dragThreshold: 5
},
function(inst, inputData, session) {
    var sessionData = session.data;

    if(inputData.eventType != EVENT_MOVE) {
        return;
    }

    if(sessionData.dragged || inputData.distance > inst.options.dragThreshold) {
        inst.trigger("drag", inputData);
        sessionData.dragged = true;
    }
});
