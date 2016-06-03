import Ember from 'ember';
import layout from 'history-outlet';
import Layer from 'history/-private/gestures/layer';
import VerticalPan from 'history/-private/gestures/recognizers/vertical-pan';

const {
  inject,
  Component
  } = Ember;

export default Component.extend({
  layout,
  tagName: 'history-outlet',
  _left: null,
  _main: null,
  _right: null,
  _outlet: null,

  gestures: inject.service('gesture-recognition'),

  pan() {
    console.log('pan!');
  },

  panStart() {
    console.log('pan start');
  },

  panLeft() {
    console.log('pan left');
  },

  panRight() {
    console.log('pan right');
  },

  panEnd() {
    console.log('pan end');
  },

  willInsertElement() {
    this._left = this.element.children[0];
    this._main = this.element.children[1];
    this._right = this.element.children[2];
    this._outlet = this.element.children[3];
  },

  setupLayer() {
    this.layer = new Layer(this.element);
    this.layer.addRecognizer(new VerticalPan());
    this.layer.on('*', ({name, event}) => {
      if (this[name]) {
        this[name](event);
      }
    });
  },

  didInsertElement() {
    this.get('gestures.manager').registerLayer(this.layer);
  },

  init() {
    this._super();
    this.setupLayer();
  }

});
