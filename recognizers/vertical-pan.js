
export default class VerticalPan {
  constructor(options) {
    this.name = 'vertical-pan';
    this.options = options;
    this.layer = undefined;
    this.stream = undefined;

    this.isRecognizing = false;
  }

  beginRecognizing(input, streams, streamEvent) {
    this.isRecognizing = true;

    this.stream = streams[streams.length - 1];
    let { series } = this.stream;

    series.forEach((event) => {
      this.relay(event);
    });
  }

  relay(event) {
    if (event.name === 'start') {
      this.layer.emit({ name: 'panStart', event });

    } else if (event.name === 'end') {
      this.isRecognizing = false;
      this.layer.emit({ name: 'panEnd', event });
      this.stream = undefined;

    } else if (event.totalY < 0 || event.prev.totalY < 0) {
      this.layer.emit({ name: 'panUp', event });

    } else {
      this.layer.emit({ name: 'panDown', event });
    }
  }

  emit(name, event) {
    this.layer.emit({ name, event });
  }

  recognize(input, streams, streamEvent) {
    if (this.isRecognizing) {
      this.relay(streamEvent);
    } else if (streamEvent.totalX === 0 && streamEvent.totalY !== 0) {
      this.beginRecognizing(input, streams, streamEvent);
    }

    return this.isRecognizing;
  }
}
