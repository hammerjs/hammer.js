import Stream from '../streams/stream';
import StreamEvent from '../streams/stream-event';

export default class Input {

  constructor(element, manager) {
    this.element = element;
    this.streams = [];
    this.attached = false;
    this.handler = null;
    this.handlerStack = [];
    this.streaming = false;
    this.hasPointer = false;

    this._handlers = { start: null, update: null, end: null, interrupt: null };
    this.manager = manager;
  }

  _bind(name) {
    const { _handlers } = this;

    return _handlers[name] = this[name].bind(this);
  }

  start(event) {
    let stream = new Stream();
    const { streams } = this;

    // splice existing streams
    for (let s of streams) {
      s.split();
    }

    this.streaming = true;
    this.hasPointer = true;

    streams.push(stream);
    let streamEvent = stream.open({
      x: event.clientX,
      y: event.clientY,
      event
    });

    if (this.handler) {
      this.handlerStack.push(this.handler);
      this.handler = null;
    }

    this.manager.recognize(this, streams, streamEvent);
  }

  update(event) {
    if (!this.streaming) {
      return;
    }

    let { streams } = this;
    let [stream] = streams;

    let streamEvent = stream.push({
      x: event.clientX,
      y: event.clientY,
      event
    });

    if (this.handler) {
      this.handler.recognize(this, this.streams, streamEvent);
    } else {
      this.manager.recognize(this, this.streams, streamEvent);
    }
  }

  _close(event) {
    let { streams } = this;
    let stream = streams.pop();

    this.streaming = false;

    let streamEvent = stream.close({
      x: event.clientX,
      y: event.clientY,
      event
    });

    if (this.handler) {
      this.handler.recognize(this, this.streams, streamEvent);
      this.handler = null;
    } else {
      this.manager.recognize(this, this.streams, streamEvent);
    }
  }

  end(event) {
    if (this.hasPointer) {
      this._close(event);
      this.hasPointer = false;
    }
  }

  interrupt(event) {
    if (this.hasPointer) {
      this._close(event);
    }
  }

  attach() {
    throw new Error('Interface Method Not Implemented');
  }

  deattach() {
    throw new Error('Interface Method Not Implemented');
  }

  destroy() {
    this.deattach();
    this.manager = null;
    this.element = null;
    this.streams = null;
    this.handler = null;
  }

}
