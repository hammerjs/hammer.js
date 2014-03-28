var Utils = Hammer.utils = {
  /**
   * extend method,
   * also used for cloning when dest is an empty object
   * @param   {Object}    dest
   * @param   {Object}    src
   * @parm  {Boolean}  merge    do a merge
   * @returns {Object}    dest
   */
  extend: function extend(dest, src, merge) {
    for(var key in src) {
      if(dest[key] !== undefined && merge) {
        continue;
      }
      dest[key] = src[key];
    }
    return dest;
  },


  /**
   * for each
   * @param obj
   * @param iterator
   */
  each: function each(obj, iterator, context) {
    var i, o;
    // native forEach on arrays
    if ('forEach' in obj) {
      obj.forEach(iterator, context);
    }
    // arrays
    else if(obj.length !== undefined) {
      for(i=-1; (o=obj[++i]);) {
        if (iterator.call(context, o, i, obj) === false) {
          return;
        }
      }
    }
    // objects
    else {
      for(i in obj) {
        if(obj.hasOwnProperty(i) &&
            iterator.call(context, obj[i], i, obj) === false) {
          return;
        }
      }
    }
  },


  /**
   * find if a string contains the needle
   * @param   {String}  src
   * @param   {String}  needle
   * @returns {Boolean} found
   */
  inStr: function inStr(src, needle) {
    return src.indexOf(needle) > -1;
  },


  /**
   * find if a node is in the given parent
   * used for event delegation tricks
   * @param   {HTMLElement}   node
   * @param   {HTMLElement}   parent
   * @returns {boolean}       has_parent
   */
  hasParent: function hasParent(node, parent) {
    while(node) {
      if(node == parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  },


  /**
   * get the center of all the touches
   * @param   {Array}     touches
   * @returns {Object}    center pageXY clientXY
   */
  getCenter: function getCenter(touches) {
    var pageX = []
      , pageY = []
      , clientX = []
      , clientY = []
      , min = Math.min
      , max = Math.max;

    // no need to loop when only one touch
    if(touches.length === 1) {
      return {
        pageX: touches[0].pageX,
        pageY: touches[0].pageY,
        clientX: touches[0].clientX,
        clientY: touches[0].clientY
      };
    }

    Utils.each(touches, function(touch) {
      pageX.push(touch.pageX);
      pageY.push(touch.pageY);
      clientX.push(touch.clientX);
      clientY.push(touch.clientY);
    });

    return {
      pageX: (min.apply(Math, pageX) + max.apply(Math, pageX)) / 2,
      pageY: (min.apply(Math, pageY) + max.apply(Math, pageY)) / 2,
      clientX: (min.apply(Math, clientX) + max.apply(Math, clientX)) / 2,
      clientY: (min.apply(Math, clientY) + max.apply(Math, clientY)) / 2
    };
  },


  /**
   * calculate the velocity between two points
   * @param   {Number}    delta_time
   * @param   {Number}    delta_x
   * @param   {Number}    delta_y
   * @returns {Object}    velocity
   */
  getVelocity: function getVelocity(delta_time, delta_x, delta_y) {
    return {
      x: Math.abs(delta_x / delta_time) || 0,
      y: Math.abs(delta_y / delta_time) || 0
    };
  },


  /**
   * calculate the angle between two coordinates
   * @param   {Touch}     touch1
   * @param   {Touch}     touch2
   * @returns {Number}    angle
   */
  getAngle: function getAngle(touch1, touch2) {
    var x = touch2.clientX - touch1.clientX
      , y = touch2.clientY - touch1.clientY;
    return Math.atan2(y, x) * 180 / Math.PI;
  },


  /**
   * angle to direction define
   * @param   {Touch}     touch1
   * @param   {Touch}     touch2
   * @returns {String}    direction constant, like DIRECTION_LEFT
   */
  getDirection: function getDirection(touch1, touch2) {
    var x = Math.abs(touch1.clientX - touch2.clientX)
      , y = Math.abs(touch1.clientY - touch2.clientY);
    if(x >= y) {
      return touch1.clientX - touch2.clientX > 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
    }
    return touch1.clientY - touch2.clientY > 0 ? DIRECTION_UP : DIRECTION_DOWN;
  },


  /**
   * calculate the distance between two touches
   * @param   {Touch}     touch1
   * @param   {Touch}     touch2
   * @returns {Number}    distance
   */
  getDistance: function getDistance(touch1, touch2) {
    var x = touch2.clientX - touch1.clientX
      , y = touch2.clientY - touch1.clientY;
    return Math.sqrt((x * x) + (y * y));
  },


  /**
   * calculate the scale factor between two touchLists (fingers)
   * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
   * @param   {Array}     start
   * @param   {Array}     end
   * @returns {Number}    scale
   */
  getScale: function getScale(start, end) {
    // need two fingers...
    if(start.length >= 2 && end.length >= 2) {
      return this.getDistance(end[0], end[1]) / this.getDistance(start[0], start[1]);
    }
    return 1;
  },


  /**
   * calculate the rotation degrees between two touchLists (fingers)
   * @param   {Array}     start
   * @param   {Array}     end
   * @returns {Number}    rotation
   */
  getRotation: function getRotation(start, end) {
    // need two fingers
    if(start.length >= 2 && end.length >= 2) {
      return this.getAngle(end[1], end[0]) - this.getAngle(start[1], start[0]);
    }
    return 0;
  },


  /**
   * boolean if the direction is vertical
   * @param    {String}    direction
   * @returns  {Boolean}   is_vertical
   */
  isVertical: function isVertical(direction) {
    return direction == DIRECTION_UP || direction == DIRECTION_DOWN;
  },


  /**
   * toggle browser default behavior with css props
   * @param   {HtmlElement}   element
   * @param   {Object}        css_props
   * @param   {Boolean}       toggle
   */
  toggleDefaultBehavior: function toggleDefaultBehavior(element, css_props, toggle) {
    if(!css_props || !element || !element.style) {
      return;
    }

    // with css properties for modern browsers
    Utils.each(['webkit', 'moz', 'Moz', 'ms', 'o', ''], function setStyle(vendor) {
      Utils.each(css_props, function(value, prop) {
          // vender prefix at the property
          if(vendor) {
            prop = vendor + prop.substring(0, 1).toUpperCase() + prop.substring(1);
          }
          // set the style
          if(prop in element.style) {
            element.style[prop] = !toggle && value;
          }
      });
    });

    var false_fn = function(){ return false; };

    // also the disable onselectstart
    if(css_props.userSelect == 'none') {
      element.onselectstart = !toggle && false_fn;
    }
    // and disable ondragstart
    if(css_props.userDrag == 'none') {
      element.ondragstart = !toggle && false_fn;
    }
  }
};
