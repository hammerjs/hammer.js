import {describe, it, expect} from 'vitest';
import {MotionAction, MotionEvent, MotionEventStream} from '../src/motion_event';
import {VelocityTracker} from '../src/velocity_tracker';
import {pointerEvent} from './test_helpers';

describe('VelocityTracker', () => {
  describe('2nd-order Least Squares (LSQ2)', () => {
    it('computes exact constant velocity in px/s', () => {
      const stream = new MotionEventStream();
      const tracker = new VelocityTracker();

      tracker.addMovement(
        stream.onPointerDown(
          pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
        )!
      );
      for (const step of [1, 2, 3, 4, 5]) {
        tracker.addMovement(
          stream.onPointerMove(
            pointerEvent('pointermove', {
              pointerId: 1,
              clientX: step * 15,
              clientY: -step * 5,
              timeStamp: step * 10,
            })
          )!
        );
      }

      tracker.computeCurrentVelocity();
      const vel = tracker.getVelocity(1);
      expect(vel.x).toBeCloseTo(1500, 1);
      expect(vel.y).toBeCloseTo(-500, 1);
    });

    it('captures terminal velocity of an accelerating flick via quadratic fit and 2-sample linear fallback', () => {
      // x(t) = 100 + 2000*t + 5000*t^2 for t <= 0 relative to release at 40ms (dx/dt at t=0 is 2000 px/s).
      const stream = new MotionEventStream();
      const tracker = new VelocityTracker();

      for (const tMs of [0, 10, 20, 30, 40]) {
        const tRelSec = (tMs - 40) / 1000;
        const x = 100 + 2000 * tRelSec + 5000 * tRelSec * tRelSec;
        const y = -x * 0.5;
        const ev =
          tMs === 0
            ? stream.onPointerDown(
                pointerEvent('pointerdown', {pointerId: 1, clientX: x, clientY: y, timeStamp: tMs})
              )!
            : stream.onPointerMove(
                pointerEvent('pointermove', {pointerId: 1, clientX: x, clientY: y, timeStamp: tMs})
              )!;
        tracker.addMovement(ev);
      }

      tracker.computeCurrentVelocity();
      expect(tracker.getVelocity(1).x).toBeCloseTo(2000, 1);
      expect(tracker.getVelocity(1).y).toBeCloseTo(-1000, 1);

      stream.reset();
      const twoSample = new VelocityTracker();
      twoSample.addMovement(
        stream.onPointerDown(
          pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 20, timeStamp: 0})
        )!
      );
      twoSample.computeCurrentVelocity();
      expect(twoSample.getVelocity(1)).toEqual({x: 0, y: 0});

      twoSample.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 35, clientY: 5, timeStamp: 10})
        )!
      );
      twoSample.computeCurrentVelocity();
      expect(twoSample.getVelocity(1).x).toBeCloseTo(2500, 1);
      expect(twoSample.getVelocity(1).y).toBeCloseTo(-1500, 1);
    });

    it('resets velocity to 0 if pointer pauses longer than assumePointerStoppedMs (40ms)', () => {
      const stream = new MotionEventStream();
      const tracker = new VelocityTracker();

      tracker.addMovement(
        stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, clientX: 0, timeStamp: 0}))!
      );
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 40, timeStamp: 16})
        )!
      );
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 80, timeStamp: 32})
        )!
      );
      tracker.addMovement(
        stream.onPointerUp(pointerEvent('pointerup', {pointerId: 1, clientX: 80, timeStamp: 92}))!
      );

      tracker.computeCurrentVelocity();
      expect(tracker.getVelocity(1)).toEqual({x: 0, y: 0});
    });

    it('ignores capacitive finger peel-off shifts on pointerup when move samples exist, while recording single-frame flicks', () => {
      const stream = new MotionEventStream();
      const tracker = new VelocityTracker();

      tracker.addMovement(
        stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, clientX: 0, timeStamp: 0}))!
      );
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 20, timeStamp: 8})
        )!
      );
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 40, timeStamp: 16})
        )!
      );
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 60, timeStamp: 24})
        )!
      );
      tracker.addMovement(
        stream.onPointerUp(pointerEvent('pointerup', {pointerId: 1, clientX: 45, timeStamp: 26}))!
      );

      tracker.computeCurrentVelocity();
      expect(tracker.getVelocity(1).x).toBeCloseTo(2500, 1);

      stream.reset();
      tracker.addMovement(
        stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 2, clientX: 0, timeStamp: 0}))!
      );
      tracker.addMovement(
        stream.onPointerUp(pointerEvent('pointerup', {pointerId: 2, clientX: 30, timeStamp: 10}))!
      );
      tracker.computeCurrentVelocity();
      expect(tracker.getVelocity(2).x).toBeCloseTo(3000, 1);
    });

    it('ignores stale motion older than 100ms horizon and caches repeated computeCurrentVelocity calls', () => {
      const stream = new MotionEventStream();
      const tracker = new VelocityTracker();

      tracker.addMovement(
        stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, clientX: 0, timeStamp: 0}))!
      );
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 150, timeStamp: 15})
        )!
      );
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 300, timeStamp: 30})
        )!
      );
      for (const t of [50, 65, 80, 95, 110, 125, 140, 155]) {
        tracker.addMovement(
          stream.onPointerMove(
            pointerEvent('pointermove', {
              pointerId: 1,
              clientX: 300 + (t - 30) * 0.1,
              timeStamp: t,
            })
          )!
        );
      }

      tracker.computeCurrentVelocity(8000);
      expect(tracker.getVelocity(1).x).toBeCloseTo(100, 1);

      // Cached fast-path when dirty === false and maxVelocity matches:
      tracker.computeCurrentVelocity(8000);
      expect(tracker.getVelocity(1).x).toBeCloseTo(100, 1);

      // Changing maxVelocity invalidates cache and clamps:
      tracker.computeCurrentVelocity(50);
      expect(tracker.getVelocity(1).x).toBeCloseTo(50, 1);
    });
  });

  describe('Radial Clamping, Multi-Touch Independence & Centroid Velocity', () => {
    it('clamps velocity radially by magnitude so diagonal swipe angles are never warped', () => {
      const stream = new MotionEventStream();
      const tracker = new VelocityTracker();
      tracker.addMovement(
        stream.onPointerDown(
          pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
        )!
      );
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 120, clientY: 40, timeStamp: 10})
        )!
      );

      const expectedAngle = Math.atan2(40, 120);
      tracker.computeCurrentVelocity(8000);

      const vel = tracker.getVelocity(1);
      expect(Math.hypot(vel.x, vel.y)).toBeCloseTo(8000, 3);
      expect(Math.atan2(vel.y, vel.x)).toBeCloseTo(expectedAngle, 6);
    });

    it('preserves each pointer velocity during asynchronous multi-touch coalesced streams and cancels opposing pinch vectors on pointerup', () => {
      const stream = new MotionEventStream();
      const tracker = new VelocityTracker();

      tracker.addMovement(
        stream.onPointerDown(
          pointerEvent('pointerdown', {pointerId: 1, clientX: 100, timeStamp: 0})
        )!
      );
      tracker.addMovement(
        stream.onPointerDown(
          pointerEvent('pointerdown', {pointerId: 2, clientX: 200, timeStamp: 2})
        )!
      );

      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 2, clientX: 210, timeStamp: 12})
        )!
      );
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 2, clientX: 220, timeStamp: 22})
        )!
      );

      const c1 = pointerEvent('pointermove', {pointerId: 1, clientX: 85, timeStamp: 15});
      const c2 = pointerEvent('pointermove', {pointerId: 1, clientX: 80, timeStamp: 20});
      const c3 = pointerEvent('pointermove', {pointerId: 1, clientX: 75, timeStamp: 25});
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {
            pointerId: 1,
            clientX: 75,
            timeStamp: 25,
            coalescedEvents: [c1, c2, c3],
          })
        )!
      );

      tracker.computeCurrentVelocity();
      expect(tracker.getVelocity(1).x).toBeCloseTo(-1000, 1);
      expect(tracker.getVelocity(2).x).toBeCloseTo(1000, 1);

      const pointerUp = stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 75, timeStamp: 28})
      )!;
      tracker.addMovement(pointerUp);
      tracker.finalizePointerUp(pointerUp, 8000);
      tracker.computeCurrentVelocity();
      expect(tracker.getVelocity(2)).toEqual({x: 0, y: 0});
    });

    it('reports 0 velocity for a stationary second finger while first finger keeps moving >40ms', () => {
      const stream = new MotionEventStream();
      const tracker = new VelocityTracker();

      tracker.addMovement(
        stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, clientX: 0, timeStamp: 0}))!
      );
      tracker.addMovement(
        stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 2, clientX: 0, timeStamp: 0}))!
      );
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 2, clientX: 20, timeStamp: 10})
        )!
      );

      let lastMove!: MotionEvent;
      for (const t of [20, 40, 60, 80]) {
        lastMove = stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: t * 2, timeStamp: t})
        )!;
        tracker.addMovement(lastMove);
      }

      tracker.computeCurrentVelocity();
      expect(tracker.getVelocity(1).x).toBeCloseTo(2000, 1);
      expect(tracker.getVelocity(2).x).toBe(0);
      expect(tracker.getCentroidVelocity(lastMove.getActivePointers()).x).toBeCloseTo(1000, 1);
    });

    it('preserves remaining pointer velocity on parallel multi-pointer pointerup without false pinch cancellation', () => {
      const stream = new MotionEventStream();
      const tracker = new VelocityTracker();

      tracker.addMovement(
        stream.onPointerDown(
          pointerEvent('pointerdown', {pointerId: 1, clientX: 100, timeStamp: 0})
        )!
      );
      tracker.addMovement(
        stream.onPointerDown(
          pointerEvent('pointerdown', {pointerId: 2, clientX: 200, timeStamp: 0})
        )!
      );
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 116, timeStamp: 16})
        )!
      );
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 2, clientX: 216, timeStamp: 16})
        )!
      );

      const pointerUp = stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 120, timeStamp: 20})
      )!;
      tracker.addMovement(pointerUp);
      tracker.finalizePointerUp(pointerUp, 8000);
      tracker.computeCurrentVelocity();
      expect(tracker.getVelocity().x).toBeGreaterThan(0);
    });

    it('covers ring-buffer wrap-around, duplicate/out-of-order timestamps, pointer handoff, and degenerate events', () => {
      const tracker = new VelocityTracker();
      expect(tracker.getVelocity()).toEqual({x: 0, y: 0});
      expect(tracker.getCentroidVelocity([])).toEqual({x: 0, y: 0});
      expect(tracker.getCentroidVelocity([{pointerId: 99, x: 0, y: 0}])).toEqual({
        x: 0,
        y: 0,
      });

      const stream = new MotionEventStream();
      tracker.addMovement(
        stream.onPointerDown(
          pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 0, timeStamp: 50})
        )!
      );
      // Duplicate timestamp overwrites in-place; out-of-order timestamp is ignored:
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 20, clientY: 0, timeStamp: 50})
        )!
      );
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 40})
        )!
      );

      let lastMove!: MotionEvent;
      for (const step of Array.from({length: 25}, (_, idx) => idx + 1)) {
        lastMove = stream.onPointerMove(
          pointerEvent('pointermove', {
            pointerId: 1,
            clientX: step * 8,
            clientY: -step * 4,
            timeStamp: 50 + step * 4,
          })
        )!;
        tracker.addMovement(lastMove);
      }
      tracker.computeCurrentVelocity();
      expect(tracker.getVelocity().x).toBeCloseTo(2000, 1);
      expect(tracker.getVelocity().y).toBeCloseTo(-1000, 1);
      expect(tracker.getVelocity(999)).toEqual({x: 0, y: 0});
      expect(tracker.getCentroidVelocity(lastMove.pointers).x).toBeCloseTo(2000, 1);

      tracker.computeCurrentVelocity(0);
      expect(tracker.getVelocity(1)).toEqual({x: 0, y: 0});

      // finalizePointerUp is a no-op for non-POINTER_UP actions:
      tracker.finalizePointerUp(lastMove);

      tracker.addMovement(
        new MotionEvent({
          action: MotionAction.POINTER_DOWN,
          eventTime: 160,
          actionIndex: 0,
          pointerType: 'touch',
          pointers: [{pointerId: 3, x: 10, y: 10}],
          originalEvent: pointerEvent('pointerdown', {pointerId: 3}),
        })
      );
      tracker.addMovement(
        new MotionEvent({
          action: MotionAction.MOVE,
          eventTime: 165,
          actionIndex: 0,
          pointerType: 'touch',
          pointers: [],
          originalEvent: pointerEvent('pointermove'),
        })
      );
      const degeneratePointerUp = new MotionEvent({
        action: MotionAction.POINTER_UP,
        eventTime: 168,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [],
        originalEvent: pointerEvent('pointerup'),
      });
      tracker.addMovement(degeneratePointerUp);
      tracker.finalizePointerUp(degeneratePointerUp);

      tracker.addMovement(
        new MotionEvent({
          action: MotionAction.UP,
          eventTime: 170,
          actionIndex: 0,
          pointerType: 'touch',
          pointers: [{pointerId: 999, x: 0, y: 0}],
          originalEvent: pointerEvent('pointerup', {pointerId: 999}),
        })
      );
      tracker.addMovement(
        new MotionEvent({
          action: MotionAction.CANCEL,
          eventTime: 175,
          actionIndex: 0,
          pointerType: 'touch',
          pointers: [],
          originalEvent: pointerEvent('pointercancel'),
        })
      );
      expect(tracker.getVelocity()).toEqual({x: 0, y: 0});
    });
  });
});
