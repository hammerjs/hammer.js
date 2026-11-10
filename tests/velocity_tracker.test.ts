import {describe, it, expect} from 'vitest';
import {MotionAction, MotionEvent, MotionEventStream} from '../src/motion_event';
import {VelocityTracker} from '../src/velocity_tracker';
import {pointerEvent} from './test_helpers';

describe('VelocityTracker', () => {
  describe('2nd-order Least Squares (LSQ2)', () => {
    it('computes exact constant velocity in px/s and px/ms', () => {
      const tracker = new VelocityTracker();
      // 15px every 10ms -> 1500 px/s (1.5 px/ms)
      for (let i = 0; i <= 5; i++) {
        tracker.addPoint(1, i * 10, i * 15, -i * 5);
      }

      tracker.computeCurrentVelocity(1000);
      expect(tracker.getXVelocity(1)).toBeCloseTo(1500, 1);
      expect(tracker.getYVelocity(1)).toBeCloseTo(-500, 1);

      tracker.computeCurrentVelocity(1);
      expect(tracker.getXVelocity(1)).toBeCloseTo(1.5, 3);
      expect(tracker.getYVelocity(1)).toBeCloseTo(-0.5, 3);
    });

    it('captures terminal velocity of an accelerating flick via quadratic fit and 2-sample linear fallback', () => {
      // Trajectory x(t) = 100 + 2000*t + 5000*t^2 where t <= 0 (seconds relative to release at 40ms).
      // Instantaneous derivative dx/dt at release (t = 0, timeMs = 40) is exactly 2000 px/s!
      const tracker = new VelocityTracker();
      for (const tMs of [0, 10, 20, 30, 40]) {
        const tRelSec = (tMs - 40) / 1000;
        const x = 100 + 2000 * tRelSec + 5000 * tRelSec * tRelSec;
        tracker.addPoint(1, tMs, x, -x * 0.5);
      }

      tracker.computeCurrentVelocity(1000);
      expect(tracker.getXVelocity(1)).toBeCloseTo(2000, 1);
      expect(tracker.getYVelocity(1)).toBeCloseTo(-1000, 1);

      // 2-sample linear fallback:
      const twoSample = new VelocityTracker();
      twoSample.addPoint(1, 0, 10, 20);
      twoSample.computeCurrentVelocity(1000);
      expect(twoSample.getVelocity(1)).toEqual({x: 0, y: 0, speed: 0});

      twoSample.addPoint(1, 10, 35, 5);
      twoSample.computeCurrentVelocity(1000);
      expect(twoSample.getXVelocity(1)).toBeCloseTo(2500, 1);
      expect(twoSample.getYVelocity(1)).toBeCloseTo(-1500, 1);
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

      // User holds finger still for 60ms (> 40ms threshold) before lifting at t=92ms:
      tracker.addMovement(
        stream.onPointerUp(pointerEvent('pointerup', {pointerId: 1, clientX: 80, timeStamp: 92}))!
      );

      tracker.computeCurrentVelocity(1000);
      expect(tracker.getXVelocity(1)).toBe(0);
      expect(tracker.getYVelocity(1)).toBe(0);
    });

    it('preserves full release velocity when stationary pointerup arrives within a frame of last move, and records displaced pointerup', () => {
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
        stream.onPointerUp(pointerEvent('pointerup', {pointerId: 1, clientX: 60, timeStamp: 28}))!
      );

      tracker.computeCurrentVelocity(1000);
      expect(tracker.getXVelocity(1)).toBeCloseTo(2500, 1);

      // Displaced pointerup without an intermediate move records liftoff sample:
      stream.reset();
      tracker.addMovement(
        stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 2, clientX: 0, timeStamp: 0}))!
      );
      tracker.addMovement(
        stream.onPointerUp(pointerEvent('pointerup', {pointerId: 2, clientX: 30, timeStamp: 10}))!
      );
      tracker.computeCurrentVelocity(1000);
      expect(tracker.getXVelocity(2)).toBeCloseTo(3000, 1);
    });

    it('ignores stale motion older than horizonMs (100ms) and caches repeated computeCurrentVelocity calls', () => {
      const tracker = new VelocityTracker({horizonMs: 100});

      tracker.addPoint(1, 0, 0, 0);
      tracker.addPoint(1, 15, 150, 0);
      tracker.addPoint(1, 30, 300, 0);
      for (let t = 50; t <= 160; t += 15) {
        tracker.addPoint(1, t, 300 + (t - 30) * 0.1, 0); // 100 px/s slow creep
      }

      tracker.computeCurrentVelocity(1000, 8000);
      expect(tracker.getXVelocity(1)).toBeCloseTo(100, 1);

      // Cache hit with identical units & maxVelocity:
      tracker.computeCurrentVelocity(1000, 8000);
      expect(tracker.getXVelocity(1)).toBeCloseTo(100, 1);

      // Cache invalidation when units change:
      tracker.computeCurrentVelocity(1, 8);
      expect(tracker.getXVelocity(1)).toBeCloseTo(0.1, 3);

      // When only 1 sample falls inside a short horizonMs (< assumePointerStoppedMs), returns 0:
      const shortHorizon = new VelocityTracker({horizonMs: 15, assumePointerStoppedMs: 50});
      shortHorizon.addPoint(1, 0, 0, 0);
      shortHorizon.addPoint(1, 30, 60, 0);
      shortHorizon.computeCurrentVelocity(1000);
      expect(shortHorizon.getXVelocity(1)).toBe(0);
    });
  });

  describe('Radial Clamping, Multi-Touch Independence & Centroid Velocity', () => {
    it('clamps velocity radially by magnitude so diagonal fling angles are never warped', () => {
      const tracker = new VelocityTracker();
      tracker.addPoint(1, 0, 0, 0);
      // vx = 12,000 px/s, vy = 4,000 px/s (angle = atan2(1, 3))
      tracker.addPoint(1, 10, 120, 40);

      const expectedAngle = Math.atan2(40, 120);
      tracker.computeCurrentVelocity(1000, 8000);

      const vel = tracker.getVelocity(1);
      expect(vel.speed).toBeCloseTo(8000, 3);
      expect(Math.atan2(vel.y, vel.x)).toBeCloseTo(expectedAngle, 6);
    });

    it('preserves each pointer velocity during asynchronous multi-touch coalesced streams', () => {
      const stream = new MotionEventStream();
      const tracker = new VelocityTracker();

      // Finger 1 at x=100 moving left (-1000 px/s), Finger 2 at x=200 moving right (+1000 px/s)
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

      // Finger 2 moves at t=12 and t=22 (+1000 px/s):
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

      // Finger 1 fires a high-refresh coalesced burst at t=15, 20, 25 (-1000 px/s):
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

      tracker.computeCurrentVelocity(1000);
      expect(tracker.getXVelocity(1)).toBeCloseTo(-1000, 1);
      expect(tracker.getXVelocity(2)).toBeCloseTo(1000, 1);
      expect(tracker.hasOpposingVelocity(1, [2], 8000)).toBe(true);

      // Pinch liftoff via `recordStreamEvent` cancels opposing velocity completely:
      tracker.recordStreamEvent(
        stream.onPointerUp(pointerEvent('pointerup', {pointerId: 1, clientX: 75, timeStamp: 28}))!
      );
      expect(tracker.getXVelocity(2)).toBe(0);
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
      // Finger 2 moves briefly at t=10ms then stops completely:
      tracker.addMovement(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 2, clientX: 20, timeStamp: 10})
        )!
      );

      // Finger 1 keeps moving through t=80ms (70ms after Finger 2 stopped > 40ms threshold):
      for (const t of [20, 40, 60, 80]) {
        tracker.addMovement(
          stream.onPointerMove(
            pointerEvent('pointermove', {pointerId: 1, clientX: t * 2, timeStamp: t})
          )!
        );
      }

      tracker.computeCurrentVelocity(1000);
      expect(tracker.getXVelocity(1)).toBeCloseTo(2000, 1);
      expect(tracker.getXVelocity(2)).toBe(0);
      expect(tracker.getCentroidVelocity([1, 2]).x).toBeCloseTo(1000, 1);
    });

    it('detects parallel multi-pointer velocities without false pinch cancellation', () => {
      const tracker = new VelocityTracker();
      tracker.addPoint(1, 0, 100, 0);
      tracker.addPoint(2, 0, 200, 0);
      tracker.addPoint(1, 16, 116, 0);
      tracker.addPoint(2, 16, 216, 0);

      expect(tracker.hasOpposingVelocity(1, [2], 8000)).toBe(false);
    });

    it('covers ring-buffer wrap-around, duplicate/out-of-order timestamps, pointer handoff, and degenerate events', () => {
      const tracker = new VelocityTracker();
      // Empty queries return 0 safely:
      expect(tracker.getXVelocity()).toBe(0);
      expect(tracker.getYVelocity()).toBe(0);
      expect(tracker.getVelocity()).toEqual({x: 0, y: 0, speed: 0});
      expect(tracker.getCentroidVelocity()).toEqual({x: 0, y: 0, speed: 0});
      expect(tracker.getCentroidVelocity([99])).toEqual({x: 0, y: 0, speed: 0});

      // Duplicate timestamp overwrites value; out-of-order timestamp resets cleanly; >20 samples wrap ring:
      tracker.addPoint(1, 50, 10, 0);
      tracker.addPoint(1, 50, 20, 0);
      tracker.addPoint(1, 40, 0, 0);
      for (let i = 1; i <= 25; i++) {
        tracker.addPoint(1, 40 + i * 4, i * 8, -i * 4);
      }
      tracker.computeCurrentVelocity(1000);
      expect(tracker.getXVelocity()).toBeCloseTo(2000, 1);
      expect(tracker.getYVelocity()).toBeCloseTo(-1000, 1);
      expect(tracker.getXVelocity(999)).toBe(0);
      expect(tracker.getYVelocity(999)).toBe(0);
      expect(tracker.getCentroidVelocity().x).toBeCloseTo(2000, 1);

      // maxVelocity <= 0 clamps to 0:
      tracker.computeCurrentVelocity(1000, 0);
      expect(tracker.getVelocity(1)).toEqual({x: 0, y: 0, speed: 0});

      // Multi-pointer clearPointer, activePointerId handoff, CANCEL, and degenerate empty events:
      const stream = new MotionEventStream();
      const streamTracker = new VelocityTracker();
      streamTracker.recordStreamEvent(
        stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, clientX: 0, timeStamp: 0}))!
      );
      streamTracker.recordStreamEvent(
        stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 2, clientX: 0, timeStamp: 2}))!
      );
      streamTracker.recordStreamEvent(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 20, timeStamp: 12})
        )!
      );
      streamTracker.recordStreamEvent(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 2, clientX: 20, timeStamp: 12})
        )!
      );
      // Lift active pointer 1 (parallel motion -> clearPointer(1), activePointerId shifts to 2):
      streamTracker.recordStreamEvent(
        stream.onPointerUp(pointerEvent('pointerup', {pointerId: 1, clientX: 30, timeStamp: 20}))!
      );
      streamTracker.computeCurrentVelocity(1000);
      expect(streamTracker.getXVelocity()).toBeGreaterThan(0);

      // Clear remaining pointer 2 -> activePointerId becomes null:
      streamTracker.clearPointer(2);
      expect(streamTracker.getXVelocity()).toBe(0);

      // POINTER_DOWN when activePointerId is null sets activePointerId:
      streamTracker.addMovement(
        new MotionEvent({
          action: MotionAction.POINTER_DOWN,
          downTime: 0,
          eventTime: 25,
          actionIndex: 0,
          pointerType: 'touch',
          pointers: [{pointerId: 3, x: 10, y: 10, pressure: 0.5}],
          originalEvent: pointerEvent('pointerdown', {pointerId: 3}),
        })
      );
      expect(streamTracker.hasOpposingVelocity(3, [3])).toBe(false);

      // Empty MOVE, untracked UP, and CANCEL:
      streamTracker.addMovement(
        new MotionEvent({
          action: MotionAction.MOVE,
          downTime: 0,
          eventTime: 30,
          actionIndex: 0,
          pointerType: 'touch',
          pointers: [],
          originalEvent: pointerEvent('pointermove'),
        })
      );
      streamTracker.addMovement(
        new MotionEvent({
          action: MotionAction.UP,
          downTime: 0,
          eventTime: 32,
          actionIndex: 0,
          pointerType: 'touch',
          pointers: [{pointerId: 999, x: 0, y: 0, pressure: 0.5}],
          originalEvent: pointerEvent('pointerup', {pointerId: 999}),
        })
      );
      streamTracker.addMovement(
        new MotionEvent({
          action: MotionAction.CANCEL,
          downTime: 0,
          eventTime: 35,
          actionIndex: 0,
          pointerType: 'touch',
          pointers: [],
          originalEvent: pointerEvent('pointercancel'),
        })
      );
      expect(streamTracker.getXVelocity()).toBe(0);
    });
  });
});
