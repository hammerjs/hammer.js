import Ember from 'ember';
import cloneRange from 'history/utils/dom/clone-range';

const {
  A,
  computed,
  inject,
  Service,
  Evented
  } = Ember;

const {
  Promise // jshint ignore:line
  } = Ember.RSVP;

const UNKNOWN_SEGMENT = false;
let STACK_ID = 0;

export default Service.extend(Evented, {
  routing: inject.service('-routing'),
  router: computed.alias('routing.router'),

  cache: undefined,
  stack: undefined,
  seen: undefined,
  _isHistoryOperation: false,
  _nextState: undefined,

  previous: computed.alias('stack.lastObject'),
  next: computed.alias('seen.lastObject'),
  current: undefined,

  back() {
    let t = this.get('stack').get('lastObject');
    let r = this.get('current');

    if (t) {
      this._isHistoryOperation = !0;
      this._nextState = {
        next: r,
        current: t,
        previous: undefined
      };

      return this.get('router').transitionTo(t.url)
        .finally(() => {
          this._nextState = undefined;
          this._isHistoryOperation = false;
        });
    }

    return Promise.reject('no history present');
  },

  forward() {
    let t = this.get('seen.lastObject');
    let r = this.get('current');

    if (t) {
      this._isHistoryOperation = true;
      this._nextState = {
        previous: r,
        current: t,
        next: undefined
      };

      return this.get('router').transitionTo(t.url)
        .finally(() => {
          this._nextState = undefined;
          this._isHistoryOperation = false;
        });
    }

    return Promise.reject('no forward history present');
  },

  segmentFor(outletName, stackItem) {
    if (!stackItem) {
      return UNKNOWN_SEGMENT;
    }

    const cache = this.get('cache');
    let data = cache.get(stackItem.url);

    if (!data || !data.segments) {
      return UNKNOWN_SEGMENT;
    }

    let segment = data.segments.get(`${outletName}-main`);

    return segment ? segment.child || segment : UNKNOWN_SEGMENT;
  },

  updateCache(url, data) {
    const cache = this.get('cache');

    let stale = cache.get(url);

    if (stale) {
      stale.segments.forEach((segment) => {
        segment.dom = null;
        segment.parent = null;
        segment.child = null;
      });
    }

    this.get('cache').set(url, data);
  },

  actions: {

    back() {
      return this.back();
    },

    forward() {
      return this.forward();
    }

  },

  init() {
    function walkOutlets(outlets) {
      let segments = new Map();
      let lastStackItemSeen = null;

      outlets.forEach(function(outletMorph) {
        let handler = outletMorph._state.outletState.render;
        let key = `${handler.name}-${handler.outlet}`;
        let segment = {
            name: handler.name,
            outlet: handler.outlet,
            key: key,
            dom: cloneOutlet(outletMorph),
            parent: lastStackItemSeen,
            child: null
          };

        if (lastStackItemSeen) {
          lastStackItemSeen.child = segment;
        }

        lastStackItemSeen = segment;
        segments.set(key, segment);

      });

      return segments;
    }

    function cloneOutlet(element) {
      let outletElement = cloneRange('outlet-segment', element.firstNode, element.lastNode);

      outletElement.id = STACK_ID++;
      return outletElement;
    }

    this._super();

    this.set('stack', new A([]));
    this.set('cache', new Map());
    this.set('seen', new A([]));

    const router = this.get('router');

    router.on('willTransition', () => {
      let currentStackItem = this.get('current');

      if (currentStackItem) {
        let segments = walkOutlets(router._toplevelView._outlets);
        this.updateCache(currentStackItem.url, { segments });
      }
    });

    router.on('didTransition', () => {
      if (this._isHistoryOperation) {
        let nextState = this._nextState;

        if (nextState.previous) {
          this.get('seen').popObject();
          this.set('current', nextState.current);
          this.get('stack').pushObject(nextState.previous);
        } else {
          this.get('stack').popObject();
          this.set('current', nextState.current);
          this.get('seen').pushObject(nextState.next);
        }

        this.trigger(
          'didTransition',
          this.getProperties('previous', 'next', 'current')
        );

      } else {
        let location = router.get('_location') || router.get('location');
        let url = location.lastSetURL || router.get('url');
        let previousStackItem = this.get('current');
        let currentStackItem = {
          url,
          routeName: router.currentRouteName
        };

        this.set('current', currentStackItem);
        this.get('seen').clear();

        if (previousStackItem) {
          this.get('stack').pushObject(previousStackItem);
        }

        this.trigger('didTransition', {
          previous: previousStackItem,
          current: currentStackItem,
          next: undefined
        });
      }
    });
  }
});
