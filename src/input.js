/**
 * create new input type instance
 * @param inst
 * @returns {}
 * @constructor
 */
function Input(inst) {
    var type = 'TouchMouse';
    if(SUPPORT_POINTEREVENTS) {
        type = 'PointerEvents';
    } else if(SUPPORT_ONLY_TOUCHEVENTS) {
        type = 'Touch';
    }
    return new Input[type](inst, inputHandler);
}

/**
 * handle input events
 * @param inst
 * @param inputType
 * @param inputData
 */
function inputHandler(inst, inputType, inputData) {
    var session;

    if(inputType == 'start') {
        // create session
        session = new Session(inst);
        inst.sessions.unshift(session);
    } else {
        // get latest session
        session = inst.sessions[0];
    }

    extendInputData(inputType, inputData);

    // update the session and run gestures
    session.update(inputData);
}

/**
 * extend the data with some usable properties like scale, rotate, velocity etc
 * @param inputType
 * @param inputData
 * @returns inputData
 */
function extendInputData(inputType, inputData) {
    inputData.inputType = inputType;

    inputData.scale = 1;
    inputData.rotation = 0;

    return inputData;
}
