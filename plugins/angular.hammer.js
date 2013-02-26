/*
 * Angular Hammer
 *
 * https://github.com/monospaced/angular-hammer
 *
 * Within an Angular.js application, allows you to specify custom behaviour on Hammer.js touch events.
 *
 * Usage, currently as attribute only:
 *
 *    hm-tap="{expression}"
 *
 * You can change the default settings by adding a second attribute with options:
 *
 *    hm-tap-opts="{drag: false, transform: false}"
 *
 * Include this file, and add `hmTouchevents` to your app's dependencies.
 *
 */

var hmTouchevents = angular.module('hmTouchevents', []);

angular.forEach('hmHold:hold hmTap:tap hmDoubletap:doubletap hmDrag:drag hmDragup:dragup hmDragdown:dragedown hmDragleft:dragleft hmDragright:dragright hmSwipe:swipe hmSwipeup:swipeup hmSwipedown:swipedown hmSwipeleft:swipeleft hmSwiperight:swiperight hmTransform:transform hmRotate:rotate hmPinch:pinch hmPinchin:pinchin hmPinchout:pinchout hmTouch:touch hmRelease:release'.split(' '), function(name){
  var directive = name.split(':'),
      directiveName = directive[0],
      eventName = directive[1];
  hmTouchevents.directive(directiveName, ['$parse', function($parse){
    return function(scope, element, attr) {
      var fn = $parse(attr[directiveName]),
          opts = $parse(attr[directiveName + 'Opts'])(scope, {}),
          hammertime = Hammer(element[0], opts).on(eventName, function(event){
            scope.$apply(function() {
              fn(scope, {$event: event});
            });
          });
    };
  }]);
});
