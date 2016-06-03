
export default class Layer {

  constructor(element) {
    this.element = element;
    this.recognizers = [];
    this.isRecognizing = false;
  }

  recognize(input, streams, streamEvent) {
    let { recognizers } = this;

    for (let recognizer of recognizers) {
      if (recognizer.recognize(input, streams, streamEvent)) {
        this.isRecognizing = true;
        input.handler = recognizer;
        break;
      }
    }

    return this.isRecognizing;
  }

  addRecognizer(recognizerInstance) {
    this.recognizers.push(recognizerInstance);
  }

  emit()

}
