(function(Hammer) {

  Hammer.plugins.showTouchesSettings = {};

  Hammer.plugins.showTouchesGesture = function() {
  };

  Hammer.plugins.showTouchesGesture.prototype = {
    name    : 'show_touches',
    priority: 0,
    handler : function(ev, inst) {


      var settings = Hammer.plugins.showTouchesSettings;

      /**
       * remove unused touch elements
       */
      function removeUnusedElements() {

        var touches_index = settings.touches_index;
        var touch_elements = settings.touch_elements;
        // remove unused touch elements
        for(var key in touch_elements) {
          if(touch_elements.hasOwnProperty(key) && !touches_index[key]) {
            document.body.removeChild(touch_elements[key]);
            delete touch_elements[key];
          }
        }
      }

      var touches_index = settings.touches_index;
      var touch_elements = settings.touch_elements;

      touches_index = {};

      // clear old elements when not using a mouse
      if(ev.pointerType != Hammer.POINTER_MOUSE && !settings.force) {
        removeUnusedElements();
        return;
      }



      // place touches by index
      for(var t = 0, total_touches = ev.touches.length; t < total_touches; t++) {
        var touch = ev.touches[t];

        var id = touch.identifier;
        touches_index[id] = touch;

        // new touch element
        if(!touch_elements[id]) {
          // create new element and attach base styles
          var template = document.createElement('div');
          template.setAttribute('style', settings.template_style);

          // append element to body
          document.body.appendChild(template);

          touch_elements[id] = template;
        }

        // Paul Irish says that translate is faster then left/top
        touch_elements[id].style.left = touch.pageX + 'px';
        touch_elements[id].style.top = touch.pageY + 'px';
      }

      removeUnusedElements();
    }
  };


  /**
   * ShowTouches gesture
   * show all touch on the screen by placing elements at there pageX and pageY
   * @param   {Boolean}   [force]
   */
  Hammer.plugins.showTouches = function(force) {

    var settings = Hammer.plugins.showTouchesSettings;

    // the circles under your fingers
    settings.template_style = 'position:absolute;z-index:9999;left:0;top:0;height:14px;width:14px;border:solid 2px #777;' +
      'background:rgba(255,255,255,.7);border-radius:20px;pointer-events:none;' +
      'margin-top:-9px;margin-left:-9px;';

    // elements by identifier
    settings.touch_elements = {};
    settings.touches_index = {};

    settings.force = force;

    Hammer.detection.register(Hammer.plugins.showTouchesGesture);
  };
})(window.Hammer);
