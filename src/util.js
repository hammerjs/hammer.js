var PI = Math.PI;

Hammer.utils = {
    /**
     * extend method,
     * also used for cloning when dest is an empty object
     * @param   {Object}    dest
     * @param   {Object}    src
     * @param   {Number}    [depth=0]
     * @return  {Object}    dest
     */
    extend: function extend(dest, src, depth) {
        depth = depth || 0;
        for (var key in src) {
            if(src.hasOwnProperty(key)) {
                if(depth && typeof(src[key]) == 'object') {
                    dest[key] = this.extend({}, src[key], depth-1);
                } else {
                    dest[key] = src[key];
                }
            }
        }

        return dest;
    },


    /**
     * faster Math.abs alternative
     * @param   value
     * @return  value
     */
    fastAbs: function fastAbs(value) {
        // equivalent to Math.abs();
        return (value ^ (value >> 31)) - (value >> 31);
    },


    /**
     * get the center of all the touches
     * @param   {TouchList}   touches
     * @return  {Object}      center
     */
    getCenter: function getCenter(touches) {
        var valuesX = [], valuesY = [];

        for(var t= 0,len=touches.length; t<len; t++) {
            valuesX.push(touches[t].pageX);
            valuesY.push(touches[t].pageY);
        }

        return {
            pageX: ((Math.min.apply(Math, valuesX) + Math.max.apply(Math, valuesX)) / 2),
            pageY: ((Math.min.apply(Math, valuesY) + Math.max.apply(Math, valuesY)) / 2)
        };
    },


    /**
     * calculate the distance between two points
     * @param   Number      pos1
     * @param   Number      pos2
     */
    getSimpleDistance: function getSimpleDistance(pos1, pos2) {
        return this.fastAbs(pos2 - pos1);
    },


    /**
     * calculate the angle between two coordinates
     * @param   Touch      touch1
     * @param   Touch      touch2
     */
    getAngle: function getAngle(touch1, touch2) {
        var y = touch2.pageY - touch1.pageY,
            x = touch2.pageX - touch1.pageX;
        return Math.atan2(y, x) * 180 / PI;
    },


    /**
     * angle to direction define
     * @param   Touch      touch1
     * @param   Touch      touch2
     * @return {Constant}  direction constant, like Hammer.DIRECTION_LEFT
     */
    getDirection: function getDirection(touch1, touch2) {
        var x = this.fastAbs(touch1.pageX - touch2.pageX),
            y = this.fastAbs(touch1.pageY - touch2.pageY);

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
    getDistance: function getDistance(touch1, touch2) {
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
    getScale: function getScale(start, end) {
        // need two fingers...
        if(start.length == 2 && end.length == 2) {
            return this.getDistance(end[0], end[1]) /
                this.getDistance(start[0], start[1]);
        }
        return 1;
    },


    /**
     * calculate the rotation degrees between two touchLists (fingers)
     * @param   TouchList   start
     * @param   TouchList   end
     * @return  float       rotation
     */
    getRotation: function getRotation(start, end) {
        // need two fingers
        if(start.length == 2 && end.length == 2) {
            return this.getAngle(end[1], end[0]) -
                this.getAngle(start[1], start[0]);
        }
        return 0;
    },


    /**
     * stop browser default behavior with css props
     * @param   Hammer.Instance inst
     * @return {*}
     */
    stopBrowserBehavior: function stopBrowserBehavior(inst) {
        var prop,
            vendors = ['webkit','moz','o',''],
            css_props = inst.options.stop_browser_behavior_props;

        for(var i = 0; i < vendors.length; i++) {
            for(var p in css_props) {
                if(css_props.hasOwnProperty(p)) {
                    prop = p;
                    if(vendors[i]) {
                        prop = vendors[i] + prop.substring(0, 1).toUpperCase() + prop.substring(1);
                    }
                    inst.element.style[prop] = css_props[p];
                }
            }
        }
    }
};