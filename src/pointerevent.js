Hammer.PointerEvent = {
    pointers: {},

    /**
     * get a list of pointers
     * @return  {Array}     Pointers
     */
    getPointers: function() {
        var pointers = [];
        for(var p in this.pointers) {
            pointers.push(p);
        }
        return pointers;
    },

    /**
     * update the position of a pointer
     * @param   EVENTTYPE   type
     * @param   Object      ev
     */
    updatePointer: function(type, ev) {
        if(type == Hammer.EVENT_END) {
            delete this.pointers[ev.pointerId];
        }
        else {
            this.pointers[ev.pointerId] = ev;
        }
    }
};