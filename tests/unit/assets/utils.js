/**
 * trigger simple dom event
 * @param obj
 * @param name
 */
function triggerEvent(obj, name) {
    var event = document.createEvent('Event');
    event.initEvent(name, true, true);
    obj.dispatchEvent(event);
}
