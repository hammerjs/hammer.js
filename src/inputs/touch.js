import Input from './input';

export default class TouchInput extends Input {

  extract(event) {
    return extractTouch(event.changedTouches[0], event);
  }

  extractMany(event) {
    return Array.prototype.slice.call(event.changedTouches).map((touch) => extractTouch(touch, event));
  }

  attach() {
    if (this.attached) {
      return;
    }
    const { element } = this;

    element.addEventListener('touchstart', this._bind('extractThen', 'start') , true);
    element.addEventListener('touchend', this._bind('extractThen', 'end') , true);
    element.addEventListener('touchcancel', this._bind('extractThen', 'interrupt') , true);
    element.addEventListener('touchmove', this._bind('extractManyThen', 'update') , true);

    this.attached = true;
  }

  deattach() {
    if (!this.attached) {
      return;
    }
    const { element, _handlers } = this;

    element.removeEventListener('touchstart', _handlers.start , true);
    element.removeEventListener('touchend', _handlers.end , true);
    element.removeEventListener('touchcancel', _handlers.interrupt , true);
    element.removeEventListener('touchmove', _handlers.update , true);
  }

}

function extractTouch(touch, event) {
  return {
    pointerId: touch.identifier,
    x: touch.clientX,
    y: touch.clientY,
    event
  };
}
