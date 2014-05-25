/**
 * tap gesture
 */
registerRecognizer('tap', {
    tapMaxInterval: 300,
    tapMinPointers: 1,
    tapMaxPointers: Infinity
},

function test(input) {
    var options = this.inst.options;
    var state = this.state;
    var eventType = input.eventType;
    var pointersInRange = inRange(input.pointers.length, options.tapMinPointers, options.tapMaxPointers);

    if(state <= STATE_RECOGNIZED && eventType === EVENT_CANCEL) {
        return STATE_CANCELLED;

    } else if(pointersInRange && input.deltaTime < options.tapMaxInterval && eventType === EVENT_END) {
        return STATE_RECOGNIZED;

    } else if(!pointersInRange || eventType !== EVENT_END) {
        return STATE_FAILED;
    }
    return STATE_POSSIBLE;
},

function handler(input) {
    var session = this.inst.sessions[0].data;
    var prevSession = this.inst.sessions[1] && this.inst.sessions[1].data;

    session.tapCount = ((prevSession && prevSession.tapCount) || 0) + 1;

    input.tapCount = session.tapCount;
    this.inst.trigger(this.name, input);
});
