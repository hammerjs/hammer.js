import Stream from '../streams/stream';
import StreamEvent from '../streams/stream-event';

export default class input {

  constructor(element) {
    this.element = element;
    this.streams = [];
    this.attached = false;

    this._handlers = { start: null, update: null, end: null, interrupt: null };
  }

  _bind(name) {
    const { _handlers } = this;

    return _handlers[name] = this[name].bind(this);
  }

  start(event) {
    let stream = new Stream();

    this.streams.push(stream);
    stream.open({
      event
    });
  }

  update(event) {
    let [stream] = this.streams;

    stream.push({
      event
    });
  }

  end(event) {
    let [stream] = this.streams;

    stream.close({
      event
    });
  }

  interrupt(event) {
    let [stream] = this.streams;

    stream.close({
      event
    });
  }

  attach() {
    throw new Error('Interface Method Not Implemented');
  }

  deattach() {
    throw new Error('Interface Method Not Implemented');
  }

}
