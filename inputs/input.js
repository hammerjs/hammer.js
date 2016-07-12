import Stream from '../streams/stream';
import StreamEvent from '../streams/stream-event';
import HashMap from 'perf-primitives/hash-map';

export default class Input {

  constructor(element, manager) {
    this.element = element;
    this.handler = null;
    this.handlerStack = [];

    this.attached = false;
    this.streaming = false;
    this.hasMoved = false;

    this.openStreams = 0;
    this.streams = new HashMap();
    this._nextEvents = new HashMap();

    this._handlers = { start: null, update: null, end: null, interrupt: null };
    this.manager = manager;

    this.attach();
  }

  _bind(name, ...args) {
    const { _handlers } = this;

    return _handlers[name] = this[name].bind(this, ...args);
  }

  extractThen(name, event) {
    this[name](this.extract(event));
  }

  extractManyThen(name, event) {
    this.extractMany(event).forEach(this[name].bind(this));
  }

  start(eventInfo) {
    let stream = Stream.create({
      pointerId: eventInfo.pointerId,
      originX: eventInfo.x,
      originY: eventInfo.y
    });

    const { streams } = this;

    streams.forEach((stream) => stream.split());

    this.streaming = true;

    this.openStreams++;
    streams.set(stream.pointerId, stream);
    // console.log('opening new stream');
    let streamEvent = stream.open(eventInfo);

    if (this.handler) {
      this.handlerStack.push(this.handler);
      this.handler = null;
    }

    this.manager.recognize(this, streams, stream, streamEvent);

    this._poll();
  }

  trigger(stream, streamEvent) {
    if (this.handler) {
      this.handler.recognize(this, this.streams, stream, streamEvent);
    } else {
      this.manager.recognize(this, this.streams, stream, streamEvent);
    }
  }

  _update(eventInfo) {
    // console.log('updating');
    let { streams } = this;
    let stream = streams.get(eventInfo.pointerId);
    let streamEvent;

    if (!this.streaming) {
      if (!this.handler) {

      }
      // console.log('closing stream');
      streamEvent = stream.close(eventInfo);

      this.hasMoved = false;
      this.trigger(stream, streamEvent);

      let wasRecognizing = this.handler;

      this.handler = null;

      // vacate this stream
      // console.log('removing stream');
      streams.delete(stream.pointerId);
      this.openStreams--;

      if (wasRecognizing && this.openStreams === 0) {
        this.manager.endInputRecognition();
      }

    } else {
      streamEvent = stream.push(eventInfo);

      this.trigger(stream, streamEvent);
    }

  }

  _poll() {
    return void requestAnimationFrame(() => {
      this._nextEvents.forEach((event, key) => {
        this._update(event);
        this._nextEvents.delete(key);
      });

      if (this.streaming) {
        this._poll();
      }
    });
  }

  update(eventInfo) {
    if (!this.streaming) {
      return;
    }

    this._nextEvents.set(eventInfo.pointerId, eventInfo);

    if (!this.hasMoved) {
      this.hasMoved = true;
      this._update(eventInfo);
    }
  }

  _close(event) {
    if (this.streaming) {
      // console.log('received close event');
      this.streaming = false;
      this._nextEvents.set(event.pointerId, event);
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

  extract() {
    throw new Error('Interface Method Not Implemented');
  }

  extractMany() {
    throw new Error('Interface Method Not Implemented');
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
