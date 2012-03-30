/*
 * Hammer.JS jQuery plugin
 * version 0.1
 * author: Eight Media
 * https://github.com/EightMedia/hammer.js
 */
jQuery.fn.hammer = function(options)
{
    return this.each(function()
    {
        var $el = jQuery(this);
        var hammer = new Hammer(this, options);
        var events = ['hold','tap','doubletap','transformstart','transform','transformend','dragstart','drag','dragend'];

        for(var e=0; e<events.length; e++) {
            hammer['on'+ events[e]] = (function($el, eventName) {
                return function(ev) {
                    $el.trigger(jQuery.Event(eventName, ev));
                };
            })($el, events[e]);
        }
    });
};