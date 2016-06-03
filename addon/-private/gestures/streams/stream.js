import StreamEvent from './stream-event';

export default class Stream {

  constructor() {
    this.segments = null;
    this.series = null;
    this.active = false;
  }

  open(info) {
    this.active = true;
    this.segments = [];
    this.series = [];

    this.segments.push(this.series);

    let streamEvent = new StreamEvent('start', info);

    this.series.push(streamEvent);
    return streamEvent;
  }

  push(info) {
    if (this.segments.length > 1 || this.series.length > 2) {
      info.cancelable = false;
    }

    let lastEvent = this.series[this.series.length - 1];
    let streamEvent = new StreamEvent('move', info, lastEvent);

    this.series.push(streamEvent);
    return streamEvent;
  }

  close(info) {
    this.active = false;
    let lastEvent = this.series[this.series.length - 1];
    let streamEvent = new StreamEvent('end', info, lastEvent);

    this.series.push(streamEvent);
    return streamEvent;
  }

  silence() {
    let [down, initial] = this.segments[0];

    down.silence();
    initial.silence();
  }

  split() {
    this.series = [];
    this.segments.push(this.series);
  }

}
