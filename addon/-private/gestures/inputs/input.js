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
    this.hasMoved = false;
    this._nextEvent = undefined;

    this._handlers = { start: null, update: null, end: null, interrupt: null };
    this.manager = manager;

    this.attach();
  }

  _bind(name) {
    const { _handlers } = this;

    return _handlers[name] = this[name].bind(this);
  }

  start(event) {
    let stream = new Stream();
    const { streams } = this;

    // splice existing streams
    for (let i = 0; i < streams.length; i++) {
      // console.log('splitting existing stream');
      streams[i].split();
    }

    this.streaming = true;

    streams.push(stream);
    // console.log('opening new stream');
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

    this._poll();
  }

  trigger(streamEvent) {
    if (this.handler) {
      this.handler.recognize(this, this.streams, streamEvent);
    } else {
      this.manager.recognize(this, this.streams, streamEvent);
    }
  }

  _update(event) {
    // console.log('updating');
    let { streams } = this;
    let [stream] = streams;
    let streamEvent;

    if (!this.streaming) {
      if (!this.handler) {

      }
      // console.log('closing stream');
      streamEvent = stream.close({
        x: event.clientX,
        y: event.clientY,
        event
      });

      this.hasMoved = false;
      this.trigger(streamEvent);

      let wasRecognizing = this.handler;

      this.handler = null;

      // vacate this stream
      // console.log('removing stream');
      streams.pop();

      if (wasRecognizing && !streams.length) {
        this.manager.endInputRecognition();
      }

    } else {
      streamEvent = stream.push({
        x: event.clientX,
        y: event.clientY,
        event
      });

      this.trigger(streamEvent);
    }

  }

  _poll() {
    return void requestAnimationFrame(() => {
      let event = this._nextEvent;

      if (event) {
        this._update(event);
        this._nextEvent = undefined;
      }

      if (this.streaming) {
        this._poll();
      }
    });
  }

  update(event) {
    if (!this.streaming) {
      return;
    }

    this._nextEvent = event;
    if (!this.hasMoved) {
      this.hasMoved = true;
      this._update(event);
    }
  }

  _close(event) {
    if (this.streaming) {
      // console.log('received close event');
      this.streaming = false;
      this._nextEvent = event;
    }
  }

  end(event) {
    if (this.streaming) {
      this._close(event);
    }
  }

  interrupt(event) {
    if (this.streaming) {
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
