/**
 * pinch gesture
 */
registerRecognizer('pinch', {
    pinchMinScale: .1,
    pinchMinPointers: 2,
    pinchMaxPointers: Infinity
},

function test(input) {
    var options = this.inst.options;
    var state = this.state;
    var eventType = input.eventType;
    var pointersInRange = inRange(input.pointers.length, options.pinchMinPointers, options.pinchMaxPointers);
    var isStarted = inRange(state, STATE_BEGAN, STATE_CHANGED);

    if(state <= STATE_RECOGNIZED && eventType === EVENT_CANCEL) {
        return STATE_CANCELLED;

    } else if(pointersInRange && (isStarted || Math.abs(1-input.scale) > options.pinchMinScale) && eventType < EVENT_END) {
        return (state < STATE_BEGAN) ? STATE_BEGAN : STATE_CHANGED;

    } else if(!pointersInRange || eventType === EVENT_END) {
        return isStarted ? STATE_ENDED : STATE_FAILED;
    }
    return STATE_POSSIBLE;
},

function handler(input) {
    this.gestures.preventRecognizers(['tap', 'pan']);
    this.inst.trigger(this.name + this.getEventStatePostfix(), input);
});
