/*! faketouches.js - v0.0.1 - 2013-02-22
 * Copyright (c) 2013 Jorik Tangelder <j.tangelder@gmail.com>;
 * Licensed under the MIT license */

(function(window) {
    'use strict';

    // simple hack to trick touch detection
    window.ontouchstart = true;


    function FakeTouches(element) {
        this.element = element;

        this.touches = [];
    }


    /**
     * insert touches by xy per touch
     * [ [x,y], [x,y] ]
     * @param {Array} touches
     */
    FakeTouches.prototype.setTouches = function(touches) {
        return this.touches = touches;
    };


    /**
     * simple methods to just trigger an event
     */
    ['start','end','move','cancel'].forEach(function(val) {
        FakeTouches.prototype[val] = (function(type) {
            return function(touches) {
                if(touches) {
                    this.touches = touches;
                }
                this.triggerEvent('touch'+ type, this.touches);
            };
        })(val);
    });


    /**
     * move touches to new positions. all with x ammount, or per touch
     * @param  {Mixed}	dx		When dx is an array, each touch can be updated
     * @param  {Number} [dy]
     */
    FakeTouches.prototype.moveBy = function(dx, dy) {
        var self = this;
        // each touch must be updated
        if(typeof dx == 'object') {
            var delta_touches = dx;
            this.touches.forEach(function(val, i) {
                self.touches[i][0] += delta_touches[i][0];
                self.touches[i][1] += delta_touches[i][1];
            });
        }
        // add dx,dy to all touches
        else {
            this.touches.forEach(function(val, i) {
                self.touches[i][0] += dx;
                self.touches[i][1] += dy;
            });
        }

        this.move();

        return this.touches;
    };


    FakeTouches.prototype.createTouchList = function(touches) {
        var touchlist = [];
        touches.forEach(function(val, index) {
            touchlist.push({
                pageX: val[0],
                pageY: val[1],
                clientX: val[0],
                clientY: val[1],
                identifier: index
            });
        });
        return touchlist;
    };


    FakeTouches.prototype.triggerEvent = function(name, touches) {
        var event = document.createEvent('Event');
        event.initEvent(name, true, true);
        event.touches = this.createTouchList(touches);
        return this.element.dispatchEvent(event);
    };

    window.FakeTouches = FakeTouches;
})(window);