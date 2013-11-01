(function($, undefined) {
    'use strict';

    // no jQuery or Zepto!
    if($ === undefined) {
        return;
    }

    /**
     * Bind to jQuery special event handling directly
     * @param   {Object}    [options={}]
     * @return  {jQuery}
     */
    $.each(Hammer.gestures, function(i, gesture) {

        var name = gesture.name;
        var events = gesture.events;

        $.each(events || [name], function(i, name) {
            $.event.special[name] = {

                setup: function(data, namespaces, eventHandle) {
                    var el = $(this);
                    var inst = el.data('hammer');

                    // start new hammer instance
                    if(!inst) {
                        el.data('hammer', new Hammer(this, data));
                    }
                    // change the options
                    else if(inst && data) {
                        Hammer.utils.extend(inst.options, data);
                    }
                }
            };
        });
    });

})(window.jQuery || window.Zepto);
