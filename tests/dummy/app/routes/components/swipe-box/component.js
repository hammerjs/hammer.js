/* global requestAnimationFrame */
import Ember from 'ember';
import layout from './template';
import RecognizerMixin from 'ember-gestures/mixins/recognizers';
import TweenLite from 'tweenlite';

export default Ember.Component.extend(RecognizerMixin, {
  layout,

  recognizers: 'pan',

  isPanning: false,
  _nextUpdate: undefined,
  dX: 0,
  _dX: 0,

  startAnimating() {
    if (!this._nextUpdate) {
      this.isPanning = true;
      this._nextUpdate = requestAnimationFrame(() => {
        this.updateAnimationState();
      });
    }
  },

  updateAnimationState() {
    let { _dX, dX, element } = this;

    TweenLite.set(element, { css: { x: `${_dX + dX}px` } });

    if (this.isPanning) {
      this._nextUpdate = requestAnimationFrame(() => {
        this.updateAnimationState();
      });
    } else {
      // this._dX = _dX + dX;
      this._nextUpdate = undefined;

      TweenLite.to(element, 0.35, { css: { x: `0px` } });

    }
  },

  panStart() {
    this.dX = 0;
    this.startAnimating();
  },

  panEnd(e) {
    let { deltaX } = e.originalEvent.gesture;

    this.dX = deltaX;
    this.isPanning = false;
  },

  panLeft(e) {
    if (this.isPanning) {
      let { deltaX } = e.originalEvent.gesture;

      this.dX = deltaX;
    }
  },

  panRight(e) {
    if (this.isPanning) {
      let { deltaX } = e.originalEvent.gesture;

      this.dX = deltaX;
    }
  }

});
