import Input from './input';
import SUPPORTS_PASSIVE from '../utils/supports-passive';

export default class MouseInput extends Input {

  attach() {
    if (this.attached) {
      return;
    }
    const { element } = this;

    let opts = SUPPORTS_PASSIVE ? { capture: true, passive: true } : true;

    element.addEventListener('mousedown', this._bind('start'), opts);
    element.addEventListener('mouseup', this._bind('end'), opts);
    element.addEventListener('mouseexit', this._bind('interrupt'), opts);
    element.addEventListener('mousemove', this._bind('update'), opts);

    this.attached = true;
  }

  deattach() {
    if (this.attached) {
      return;
    }
    const { element, _handlers } = this;

    let opts = SUPPORTS_PASSIVE ? { capture: true, passive: true } : true;

    element.removeEventListener('mousedown', _handlers.start, opts);
    element.removeEventListener('mouseup', _handlers.end, opts);
    element.removeEventListener('mouseexit', _handlers.interrupt, opts);
    element.removeEventListener('mousemove', _handlers.update, opts);
  }

}
