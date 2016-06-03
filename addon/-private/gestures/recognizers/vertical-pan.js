

export default class VerticalPan {

  constructor(options) {
    this.name = 'vertical-pan';
    this.options = options;
    this.layer = null;
    this.inflow = [];

    this.isRecognizing = false;
  }

  recognize(input, streams, streamEvent) {
    if (this.isRecognizing || streamEvent.totalY === 0 && streamEvent.totalX !== 0) {
      this.isRecognizing = true;
      this.layer.emit({
        name: 'pan',
        event: streamEvent
      });
      console.log('vertical pan!', streamEvent);
    }
  }

}
