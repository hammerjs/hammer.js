/**
 * pan gesture
 */
registerRecognizer('pan', {
    panMinDistance: 10,
    panMinPointers: 1,
    panMaxPointers: Infinity
},

function test(input) {
    var options = this.inst.options;
    var state = this.state;
    var eventType = input.eventType;
    var pointersInRange = inRange(input.pointers.length, options.panMinPointers, options.panMaxPointers);
    var isStarted = inRange(state, STATE_BEGAN, STATE_CHANGED);

    if(state <= STATE_RECOGNIZED && eventType === EVENT_CANCEL) {
        return STATE_CANCELLED;

    } else if(pointersInRange && (isStarted || input.distance > options.panMinDistance) && eventType < EVENT_END) {
        return (state < STATE_BEGAN) ? STATE_BEGAN : STATE_CHANGED;

    } else if(!pointersInRange || eventType === EVENT_END) {
        return isStarted ? STATE_ENDED : STATE_FAILED;
    }
    return STATE_POSSIBLE;
},

function handler(input) {
    this.inst.trigger(this.name + this.getEventStatePostfix(), input);
});
