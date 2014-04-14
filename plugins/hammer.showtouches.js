(function(Hammer) {
  'use strict';
  
  
  /**
   * show all touch on the screen by placing elements at there pageX and pageY
   * 
   * @usage
   * call `Hammer.plugins.showTouches()` before creating an instance to enable the plugin for all
   * instances. You can also do this later, but then you'll have to enable this per instance by setting
   * the option `show_touches` to `true`
   */
  Hammer.plugins.showTouches = function() {
    // only possible with the pointerEvents css property supported
    if(!testStyle('pointerEvents')) {
      return;
    }
    
    // the circles under your fingers
    var template_style = [
          'position: absolute;',
          'z-index: 9999;',
          'height: 14px;',
          'width: 14px;',
          'top: 0;',
          'left: 0;',
          'pointer-events: none;', // makes the element click-thru
          'border: solid 2px #777;',
          'background: rgba(255,255,255,.7);',
          'border-radius: 20px;',
          'margin-top: -9px;',
          'margin-left: -9px;'
      ].join('');
    
    // define position property
    var position_style_prop = 'lefttop';
    if(testStyle('transform')) { position_style_prop = 'transform'; }
    if(testStyle('MozTransform')) { position_style_prop = 'MozTransform'; }
    if(testStyle('webkitTransform')) { position_style_prop = 'webkitTransform'; }

    // elements by identifier
    var touch_elements = {};
    var touches_index = {};
    
    
    /**
     * check if a style property exists
     * @param prop
     * @param el
     * @returns {boolean|HTMLElement}
     */
    function testStyle(prop, el) {
      return (prop in (el || document.body).style);
    }
    
    
    /**
     * remove unused touch elements
     */
    function removeUnusedElements() {
      // remove unused touch elements
      for(var key in touch_elements) {
        if(touch_elements.hasOwnProperty(key) && !touches_index[key]) {
          document.body.removeChild(touch_elements[key]);
          delete touch_elements[key];
        }
      }
    }
  
  
    /**
     * set position of an element with top/left or css transform
     * @param el
     * @param x
     * @param y
     */
    function setPosition(el, x, y) {
      if(position_style_prop == 'lefttop') {
        el.style.left = x + 'px';
        el.style.top = y + 'px';
      }
      else {
        el.style[position_style_prop] = 'translate('+ x +'px, '+ y +'px)';
      }
    }
    

    Hammer.detection.register({
      name    : 'show_touches',
      priority: 0,
      handler : function(ev) {
        touches_index = {};

        // clear old elements when not using a mouse
        if(ev.pointerType != Hammer.POINTER_MOUSE) {
          removeUnusedElements();
          return;
        }

        // place touches by index
        for(var t = 0, len = ev.touches.length; t < len; t++) {
          var touch = ev.touches[t];
          var id = touch.identifier;
          touches_index[id] = touch;

          // new touch element
          if(!touch_elements[id]) {
            var template = document.createElement('div');
            template.setAttribute('style', template_style);
            document.body.appendChild(template);

            touch_elements[id] = template;
          }
          setPosition(touch_elements[id], touch.pageX, touch.pageY);
        }
        removeUnusedElements();
      }
    });
  };
})(window.Hammer);
