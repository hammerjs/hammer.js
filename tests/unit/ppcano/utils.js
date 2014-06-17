
function createEvent(name, x, y, identifier) {

  var event = document.createEvent('Event');
  event.initEvent('touch'+name, true, true);

  event.touches = [{clientX: x, 
                    clientY: y, 
                    identifier: identifier || 0}];

  //https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent.changedTouches
  event.changedTouches = [{ clientX: x, 
                            clientY: y, 
                            identifier: identifier || 0}];
  return event;

}

function dispatchEvent(el, name, x, y, identifier) {

  var event = createEvent(name, x, y, identifier);
  el.dispatchEvent(event);

};
