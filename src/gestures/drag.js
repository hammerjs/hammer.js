Gestures.Drag = {
    options: {
        minDistance: 10
    },
    handler: function(inst, inputData) {
        var options = inst.options;

        console.log(this, arguments);

        if(inputData.distance > options.minDistance) {
            //inst.trigger("drag");
        }
    }
};
