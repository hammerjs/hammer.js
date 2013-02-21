/*globals Hammer, jQuery */

/*
 * Hammer.js jQuery plugin based on Ha
 *
 * @author Łukasz Lipiński (uzza17@gmail.com)
 * @version 0.1
 * @license Released under the MIT license
 * @see https://github.com/lukaszlipinski/jquery.hammer
 */

(function($, Hammer) {
	"use strict";

	var event_names = ['hold', 'tap', 'doubletap', 'transformstart', 'transform', 'transformend', 'dragstart', 'drag', 'dragend', 'swipe', 'release'],
		event_name, i, l = event_names.length;

	for (i = 0; i < l; i++) {
		event_name = event_names[i];

		(function(event_name) {
			$.event.special[event_name] = {
				add : function(e) {
					var $currentTarget = $(this),
						$targets = e.selector ? $currentTarget.find(e.selector) : $currentTarget;

					$targets.each(function(index, el) {
						var hammer = new Hammer(el),
							$el = $(el);

						$el.data("hammer", hammer);

						hammer['on' + event_name] = (function($el) {
							return function(event) {
								$el.trigger($.Event(event_name, event));
							};
						}($el));
					});
				},

				teardown: function(namespaces) {
					var $el = $(this);

					$el.data('hammer').destroy();
					$el.removeData('hammer');
				}
			};
		}(event_name));
	}
}(jQuery, Hammer));