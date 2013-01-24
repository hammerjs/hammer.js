Hammer.util = {
    /**
     * simple extend method
     * @param   Object      obj1
     * @param   Object      obj2
     * @return  Object      obj1
     */
    extend: function(obj1, obj2) {
        for (var key in obj2) {
            obj1[key] = obj2[key];
        }
        return obj1;
    },


    /**
     * get the center of all the touches
     * @param   TouchList   touches
     * @return  Object      center  {pageX, pageY}
     */
    getCenter: function(touches) {
        return touches[0];
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
     * angle to direction define
     * @param  {Number}     angle
     * @return {String}     int direction
     */
    getDirection: function(angle) {
        var directions = {
            DIRECTION_DOWN  : angle >= 45 && angle < 135,
            DIRECTION_LEFT  : angle >= 135 || angle <= -135,
            DIRECTION_UP    : angle < -45 && angle > -135,
            DIRECTION_RIGHT : angle >= -45 && angle <= 45
        };

        for(var key in directions){
            if(directions[key]) {
                return Hammer[key];
            }
        }
        return null;
    },


    /**
     * calculate the scale size between two touchLists (fingers)
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
        return 0;
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
