Hammer.PointerEvent = {
    pointers: {},

    /**
     * get a list of pointers
     * @return  {Array}     Pointers
     */
    getPointers: function() {
        var pointers = this.pointers;
        var touchlist = [];
        Object.keys(pointers).sort().forEach(function(id) {
            touchlist.push(pointers[id]);
        });
        return touchlist;
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
    },

    /**
     * reset the list
     */
    reset: function() {
        this.pointers = {};
    }
};