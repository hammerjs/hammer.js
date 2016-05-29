import Input from './input';

export default class MouseInput extends Input {

  attach() {
    if (this.attached) {
      return;
    }
    const { element } = this;

    element.addEventListener('mousedown', this._bind('start') , true);
    element.addEventListener('mouseup', this._bind('end') , true);
    element.addEventListener('mouseexit', this._bind('interrupt') , true);
    element.addEventListener('mousemove', this._bind('update') , true);

    this.attached = true;
  }

  deattach() {
    if (this.attached) {
      return;
    }
    const { element, _handlers } = this;

    element.removeEventListener('mousedown', _handlers.start , true);
    element.removeEventListener('mouseup', _handlers.end , true);
    element.removeEventListener('mouseexit', _handlers.interrupt , true);
    element.removeEventListener('mousemove', _handlers.update , true);
  }

}
