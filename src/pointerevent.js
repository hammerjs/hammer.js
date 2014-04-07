/**
 * @module hammer
 * 
 * @class PointerEvent
 * @static
 */
var PointerEvent = Hammer.PointerEvent = {
  /**
   * holds all pointers, by `identifier`
	 * @property pointers
   * @type {Object}
   */
  pointers: {},

	
  /**
   * get the pointers as an array
	 * @method getTouchList
   * @return {Array} touchlist
   */
  getTouchList: function getTouchList() {
    var touchlist = [];
    // we can use forEach since pointerEvents only is in IE10
    Utils.each(this.pointers, function(pointer){
      touchlist.push(pointer);
    });

    return touchlist;
  },
	

  /**
   * update the position of a pointer
	 * @method updatePointer
   * @param {String} type matches `EVENT_START|MOVE|END`
   * @param {Object} pointerEvent
	 * @return count {Number} count the pointers
   */
  updatePointer: function updatePointer(type, pointerEvent) {
    if(type == EVENT_END) {
      delete this.pointers[pointerEvent.pointerId];
    }
    else {
      pointerEvent.identifier = pointerEvent.pointerId;
      this.pointers[pointerEvent.pointerId] = pointerEvent;
    }

    // it's save to use Object.keys, since pointerEvents are only in newer browsers
    return Object.keys(this.pointers).length;
  },
	

  /**
   * check if ev matches pointertype
	 * @method matchType
   * @param {String} pointerType matches `POINTER_MOUSE|TOUCH|PEN`
   * @param {PointerEvent} ev
   */
  matchType: function matchType(pointerType, ev) {
    if(!ev.pointerType) {
      return false;
    }

    var pt = ev.pointerType
      , types = {};

    types[POINTER_MOUSE] = (pt === (ev.MSPOINTER_TYPE_MOUSE || POINTER_MOUSE));
    types[POINTER_TOUCH] = (pt === (ev.MSPOINTER_TYPE_TOUCH || POINTER_TOUCH));
    types[POINTER_PEN] = (pt === (ev.MSPOINTER_TYPE_PEN || POINTER_PEN));
    return types[pointerType];
  },


  /**
   * get events to bind to
	 * @method getEvents
	 * @return {Array} events, in order of start, move and end
   */
  getEvents: function getEvents() {
    return [
      'pointerdown MSPointerDown',
      'pointermove MSPointerMove',
      'pointerup pointercancel MSPointerUp MSPointerCancel'
    ];
  },
	

  /**
   * reset the stored pointers
	 * @method reset
   */
  reset: function resetList() {
    this.pointers = {};
  }
};
