Hammer.util = {
    /**
     * extend method,
     * also used for cloning when dest is an empty object
     * @param   {Object}    dest
     * @param   {Object}    src
     * @param   {Number}    [depth=0]
     * @return  {Object}    dest
     */
    extend: function(dest, src, depth) {
        depth = depth || 0;
        for (var key in src) {
            if(src.hasOwnProperty(key)) {
                if(depth && typeof(src[key]) == 'object') {
                    dest[key] = Hammer.util.extend({}, src[key], depth-1);
                } else {
                    dest[key] = src[key];
                }
            }
        }

        return dest;
    },


    /**
     * get the center of all the touches
     * @param   {TouchList}   touches
     * @return  {Object}      center
     */
    getCenter: function(touches) {
        var props = {
            pageX: 0,
            pageY: 0,
            clientX: 0,
            clientY: 0
        };

        var minmax = {};

        // walk the properties
        for(var p in props) {
            // set initial values
            minmax[p] = {
                min: Infinity,
                max: -Infinity
            };

            // walk touches and get the min and max values
            for(var t= 0,len=touches.length; t<len; t++) {
                minmax[p].min = Math.min(touches[t][p], minmax[p].min);
                minmax[p].max = Math.max(touches[t][p], minmax[p].max);
            }

            // calculate center
            props[p] = Math.round((minmax[p].min + minmax[p].max) / 2);
        }

        return props;
    },


    /**
     * calculate the distance between two points
     * @param   Number      pos1
     * @param   Number      pos2
     */
    getSimpleDistance: function(pos1, pos2) {
        return Math.abs(pos2 - pos1);
    },


    /**
     * calculate the angle between two coordinates
     * @param   Touch      touch1
     * @param   Touch      touch2
     */
    getAngle: function(touch1, touch2) {
        var y = touch2.pageY - touch1.pageY,
            x = touch2.pageX - touch1.pageX;
        return Math.atan2(y, x) * 180 / Math.PI;
    },


    /**
     * angle to direction define
     * @param   Touch      touch1
     * @param   Touch      touch2
     * @return {Constant}  direction constant, like Hammer.DIRECTION_LEFT
     */
    getDirection: function(touch1, touch2) {
        var x = Math.abs(touch1.pageX - touch2.pageX),
            y = Math.abs(touch1.pageY - touch2.pageY);

        if(x >= y) {
            return touch1.pageX - touch2.pageX > 0 ? Hammer.DIRECTION_LEFT : Hammer.DIRECTION_RIGHT;
        }
        else {
            return touch1.pageY - touch2.pageY > 0 ? Hammer.DIRECTION_UP : Hammer.DIRECTION_DOWN;
        }
    },


    /**
     * calculate the distance between two touches
     * @param   Touch      touch1
     * @param   Touch      touch2
     */
    getDistance: function(touch1, touch2) {
        var x = touch2.pageX - touch1.pageX,
            y = touch2.pageY - touch1.pageY;
        return Math.sqrt((x*x) + (y*y));
    },


    /**
     * calculate the scale factor between two touchLists (fingers)
     * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
     * @param   TouchList   start
     * @param   TouchList   end
     * @return  float       scale
     */
    getScale: function(start, end) {
        // need two fingers...
        if(start.length == 2 && end.length == 2) {
            return Hammer.util.getDistance(end[0], end[1]) /
                Hammer.util.getDistance(start[0], start[1]);
        }
        return 1;
    },


    /**
     * calculate the rotation degrees between two touchLists (fingers)
     * @param   TouchList   start
     * @param   TouchList   end
     * @return  float       rotation
     */
    getRotation: function(start, end) {
        // need two fingers
        if(start.length == 2 && end.length == 2) {
            return Hammer.util.getAngle(end[1], end[0]) -
                Hammer.util.getAngle(start[1], start[0]);
        }
        return 0;
    }
};