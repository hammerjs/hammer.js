'use strict';

Tinytest.add('Hammer.is', function (test) {
  var div = document.createElement('div');
  var mc = new Hammer(div);
  test.instanceOf(mc, Hammer.Manager, 'Instantiation OK');
  test.instanceOf(mc.get('pinch').manager, Hammer.Manager, 'Default pinch recognizer OK');
});
