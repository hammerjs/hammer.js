import Ember from 'ember';
import layout from 'history-outlet';
import Layer from 'history/-private/gestures/layer';
import VerticalPan from 'history/-private/gestures/recognizers/vertical-pan';

const {
  computed,
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

  willInsertElement() {
    this._left = this.element.children[0];
    this._main = this.element.children[1];
    this._right = this.element.children[2];
    this._outlet = this.element.children[3];
  },

  setupLayer() {

  },

  didInsertElement() {
    this.get('gestures.manager').registerLayer(this.layer);
  },

  init() {
    this._super();
    this.layer = new Layer(this.element);
  }

});
