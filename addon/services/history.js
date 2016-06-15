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
    console.log('\n	<=== BACK\n');
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
          console.log('________ COMPLETE???? ________');
        });
    }

    return Promise.reject('no history present');
  },

  forward() {
    console.log('\n	FORWARD ===>\n');
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

  segmentFor(e, t) {
    if (!t || !t.segments) {
      return UNKNOWN_SEGMENT;
    }

    let r = t.segments.get(`${e}-main`);

    return r ? r.child || r : UNKNOWN_SEGMENT;
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
    function __someIterativeMethod(iterable) {
      let r = new Map();
      let n = null;

      iterable.forEach(function(iteratedItem) {
        let i = iteratedItem._state.outletState.render;
        let a = `${i.name}-${i.outlet}`;
        let o = {
            name: i.name,
            outlet: i.outlet,
            key: a,
            dom: __someClonedRange(iteratedItem),
            parent: n,
            child: null
          };

        if (n) {
          n.child = o;
        }

        n = o;
        r.set(a, o);

      });

      return r;
    }

    function __someClonedRange(element) {
      let t = cloneRange('outlet-segment', element.firstNode, element.lastNode);

      t.id = STACK_ID++;
      return t;
    }

    this._super();

    this.set('stack', new A([]));
    this.set('cache', new Map());
    this.set('seen', new A([]));

    const router = this.get('router');

    router.on('willTransition', () => {
      let t = this.get('current');

      if (t) {
        t.segments = __someIterativeMethod(router._toplevelView._outlets);
        this.get('cache').set(t.url, t);
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
        let t = router.get('_location') || router.get('location');
        let r = t.lastSetURL || router.get('url');
        let n = this.get('current');
        let i = {
          url: r,
          routeName: router.currentRouteName
        };

        this.set('current', i);
        this.get('seen').clear();

        if (n) {
          this.get('stack').pushObject(n);
        }

        this.trigger('didTransition', {
          previous: n,
          current: i,
          next: undefined
        });
      }
    });
  }
});
