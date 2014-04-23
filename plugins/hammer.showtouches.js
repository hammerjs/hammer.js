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
        var templateStyle = [
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
        var positionStyleProp = 'lefttop';
        if(testStyle('transform')) { positionStyleProp = 'transform'; }
        if(testStyle('MozTransform')) { positionStyleProp = 'MozTransform'; }
        if(testStyle('webkitTransform')) { positionStyleProp = 'webkitTransform'; }

        // elements by identifier
        var touchElements = {};
        var touchesIndex = {};

        /**
         * check if a style property exists
         * @param {String} prop
         * @param {HTMLElement} [el=document.body]
         * @returns {Boolean}
         */
        function testStyle(prop, el) {
            return (prop in (el || document.body).style);
        }

        /**
         * remove unused touch elements
         */
        function removeUnusedElements() {
            // remove unused touch elements
            for(var key in touchElements) {
                if(touchElements.hasOwnProperty(key) && !touchesIndex[key]) {
                    document.body.removeChild(touchElements[key]);
                    delete touchElements[key];
                }
            }
        }

        /**
         * set position of an element with top/left or css transform
         * @param {HTMLElement} el
         * @param {Number} x
         * @param {Number} y
         */
        function setPosition(el, x, y) {
            if(positionStyleProp == 'lefttop') {
                el.style.left = x + 'px';
                el.style.top = y + 'px';
            } else {
                el.style[positionStyleProp] = 'translate(' + x + 'px, ' + y + 'px)';
            }
        }

        Hammer.detection.register({
            name: 'showTouches',
            priority: 0,
            handler: function(ev) {
                touchesIndex = {};

                // clear old elements when not using a mouse
                if(ev.pointerType != Hammer.POINTER_MOUSE) {
                    removeUnusedElements();
                    return;
                }

                // place touches by index
                for(var t = 0, len = ev.touches.length; t < len; t++) {
                    var touch = ev.touches[t];
                    var id = touch.identifier;
                    touchesIndex[id] = touch;

                    // new touch element
                    if(!touchElements[id]) {
                        var template = document.createElement('div');
                        template.setAttribute('style', templateStyle);
                        document.body.appendChild(template);

                        touchElements[id] = template;
                    }
                    setPosition(touchElements[id], touch.pageX, touch.pageY);
                }
                removeUnusedElements();
            }
        });
    };
})(window.Hammer);
