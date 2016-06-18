/* global Linear */
import Ember from 'ember';
import layout from './template';
import Layer from 'history/-private/gestures/layer';
import HorizontalPan from 'history/-private/gestures/recognizers/horizontal-pan';
import Animation from 'history/-private/animation';
import removeRange from 'history/utils/dom/remove-range';
import appendRange from 'history/utils/dom/append-range';

const {
  inject,
  computed,
  Component,
  RSVP
  } = Ember;

function tween(element, time, options) {
  return Animation.to(element, time, options);
}

function carryMomentum(element, duration, options) {
  return tween(element, duration, options, { ease: 'ease-out' });
}

function getDuration(streamEvent, width) {
  return (width - Math.abs(streamEvent.totalX)) * 5;
}

function updateStyle(element, css) {
  Animation.set(element, css);
}

export default Component.extend({
  layout,
  tagName: 'history-outlet',

  _left: undefined,
  _main: undefined,
  _right: undefined,
  _outlet: undefined,

  gestures: inject.service('gesture-recognition'),
  history: inject.service('history'),

  transitionAt: 0.5,
  parallax: 0.2,
  _leftDefault: undefined,
  _rightDefault: undefined,
  duration: 350,
  width: 0,

  _isTransitioning: false,

  currentRouteName: '',
  activeRouteName: computed.alias('history.currentRouteName'),

  canGoBack: computed('history.stack.lastObject', function() {
    let last = this.get('history.stack.lastObject');
    let routeName = this.get('currentRouteName');

    return !!last && last.routeName.indexOf(routeName) === 0;
  }),

  canGoForward: computed('history.seen.lastObject', function() {
    let next = this.get('history.seen.lastObject');
    let routeName = this.get('currentRouteName');

    return !!next && next.routeName.indexOf(routeName) === 0;
  }),

  // fps meter
  debugMode: false,
  _lastTime: undefined,
  _frames: undefined,
  fps: 0,
  avg: 0,
  _emulateSlowdown: false,
  low: 0,

  _fpsMeter() {
    requestAnimationFrame((time) => {
      let diff = (time - this._lastTime) / 1000;
      let fps = Math.round(1 / diff);

      let frames = this._frames = this._frames || [];

      frames.push({
        delta: diff,
        fps: fps
      });

      if (frames.length > 60) {
        frames.shift();
      }

      this._lastTime = time;

      let low = { fps: 60 };
      let avg = Math.round(
        frames.reduce((v, f) => {
          if (f.fps < low.fps) {
            low = f;
          }

          return v + f.fps;
        }, 0) / frames.length
      );

      if (low.fps < 60) {
        console.log(low.fps, Math.round(low.delta * 1000), frames);
        this._frames = [];
      }

      this.setProperties({
        fps,
        avg,
        low: low.fps
      });

      this._fpsMeter()
    })
  },


  panStart(e) {
    this.width = this._main.clientWidth;
    this.updateAnimationState(e.totalX);
  },

  panEnd(e) {
    this.resolveAnimationState(e);
  },

  panLeft(e) {
    this.updateAnimationState(e.totalX);
  },

  panRight(e) {
    this.updateAnimationState(e.totalX);
  },

  transition(isLeft) {
    const history = this.get('history');

    return isLeft ? history.back() : history.forward();
  },

  updateAnimationState(dX) {
    let availableNav = this.getProperties('canGoBack', 'canGoForward');
    let { parallax } = this;
    let scaledDeltaX = dX * parallax;
    let isLeft = dX > 0;

    if (isLeft && availableNav.canGoBack) {

      updateStyle(this._left, { x: scaledDeltaX, visibility: 'visible' });
      updateStyle(this._right, { x: this._rightDefault, visibility: 'hidden' });

    } else if (!isLeft && availableNav.canGoForward) {
      let inverseDeltaX = dX * (1 - parallax);

      updateStyle(this._right, { x: inverseDeltaX, visibility: 'visible' });
      updateStyle(this._left, { x: this._leftDefault, visibility: 'hidden' });
    } else {
      return;
    }

    updateStyle(this._main, { x: dX });
    updateStyle(this._outlet, { x: dX });
  },

  resolveAnimationState(event) {
    let dX = event.totalX;
    let { width, transitionAt, duration } = this;
    let percentComplete = dX / width;
    let absCompleted = Math.abs(percentComplete);
    let remainingTime = (1 - absCompleted) * duration;
    let isFromLeft = percentComplete > 0;
    let availableNav = this.getProperties('canGoBack', 'canGoForward');

    if (absCompleted >= transitionAt) {
      if (isFromLeft && !availableNav.canGoBack) {
        return this._cleanupAnimation(remainingTime);
      }

      if (!isFromLeft && !availableNav.canGoForward) {
        return this._cleanupAnimation(remainingTime);
      }

      let outletClone = this._outlet.cloneNode(true);
      let outDuration = getDuration(event, width);

      appendRange(this._main, outletClone.firstChild, outletClone.lastChild);

      this._outlet.style.display = 'none';
      this._outlet.style.visibility = 'hidden';
      updateStyle(this._outlet, { x: '0%' });

      this._isTransitioning = true;
      let outlet = this.element.removeChild(this._outlet);
      let promises = [this.transition(isFromLeft)];

      if (isFromLeft) {
        promises.push(
          carryMomentum(this._left, outDuration, { x: '0%' }),
          carryMomentum(this._main, outDuration, { x: '100%' })
        );
      } else {
        promises.push(
          carryMomentum(this._right, outDuration, { x: '0%' }),
          carryMomentum(this._main, outDuration, { x: '-100%' })
        );
      }

      return RSVP.all(promises)
        .finally(() => {
          this.element.insertBefore(outlet, this.element.lastElementChild);
          outlet.style.display = '';
          outlet.style.visibility = '';

          return this.resetTweens(false)
            .then(() => {
              if (this._main.firstChild) {
                removeRange(this._main.firstChild, this._main.lastChild);
              }

              this._finishTransition(
                this.get('history').getProperties('current', 'next', 'previous')
              );
              this._isTransitioning = false;
            });
        });
    }

    return this._cleanupAnimation(remainingTime);
  },

  _cleanupAnimation(remainingTime) {
    return this.resetTweens(remainingTime)
      .then(() => {
        if (this._main.firstChild) {
          removeRange(this._main.firstChild, this._main.lastChild);
        }
      });
  },

  _finishTransition(nextState) {
    let previous = this.domFor(nextState.previous, 'previous');
    let next = this.domFor(nextState.next, 'next');

    this._left.innerHTML = '';
    this._right.innerHTML = '';

    if (previous) {
      appendRange(this._left, previous.firstChild, previous.lastChild);
    }
    if (next) {
      appendRange(this._right, next.firstChild, next.lastChild);
    }
  },

  resetTweens(duration) {
    if (duration) {
      return RSVP.all([
        tween(this._left, duration, { x: this._leftDefault }),
        tween(this._main, duration, { x: 0 }),
        tween(this._outlet, duration, { x: 0 }),
        tween(this._right, duration, { x: this._rightDefault })
      ]);
    }

    updateStyle(this._right, { x: this._rightDefault, visibility: 'hidden' });
    updateStyle(this._left, { x: this._leftDefault, visibility: 'hidden' });
    updateStyle(this._main, { x: '0%' });
    updateStyle(this._outlet, { x: '0%' });

    return Promise.resolve();
  },

  domForPrevious() {
    let e = this.get('history');
    let t = this.get('currentRouteName');
    let r = e.get('previous');
    let n = e.segmentFor(t, r);

    return n ? n.dom.cloneNode(true) : false;
  },

  domFor(e) {
    let t = this.get('history');
    let r = this.get('currentRouteName');
    let n = t.segmentFor(r, e);

    return n ? n.dom.cloneNode(true) : false;
  },

  willInsertElement() {
    this._left = this.element.children[0];
    this._main = this.element.children[1];
    this._right = this.element.children[2];
    this._outlet = this.element.children[3];
  },

  willDestroyElement() {
    this._super();
    this._left = undefined;
    this._main = undefined;
    this._right = undefined;
    this._outlet = undefined;
  },

  setupLayer() {
    this.layer = new Layer();
    this.layer.addRecognizer(new HorizontalPan());
    this.layer.on('*', ({ name, event }) => {
      if (this[name]) {
        this[name](event);
      }
    });
  },

  didInsertElement() {
    this.layer.element = this.element;
    this.get('gestures.manager').registerLayer(this.layer);
    this.resetTweens();
  },

  init() {
    this._super();
    this.setupLayer();
    let leftPer = (this.parallax * 100).toFixed(2);
    let rightPer = 100 - leftPer;

    this._leftDefault =  `-${leftPer}%`;
    this._rightDefault =  `${rightPer}%`;

    this.get('history').on('didTransition', (nextState) => {
      if (!this._isTransitioning) {
        this._finishTransition(nextState);
      }
    });

    this.get('history').on('willTransition', (t) => {
      // debugger;
    });

    // this._fpsMeter();
  }

});
