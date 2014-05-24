/**
 * transform gesture
 */
registerGesture({
    scaleThreshold: 5,
    rotationThreshold: 3
},
function(inst, inputData, session) {
    var sessionData = session.data;
    var options = inst.options;

    if(sessionData.transformed || inputData.scale > options.scaleThreshold || inputData.rotation > options.rotationThreshold) {
        inst.trigger("transform", inputData);
        sessionData.transformed = true;
    }
});
