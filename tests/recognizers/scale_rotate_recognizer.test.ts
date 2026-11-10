import {describe, it, expect, vi, beforeEach} from 'vitest';
import {GestureArena} from '../../src/gesture_arena';
import {MotionAction, MotionEvent, MotionEventStream} from '../../src/motion_event';
import {PanRecognizer} from '../../src/recognizers/pan_recognizer';
import {RotateRecognizer} from '../../src/recognizers/rotate_recognizer';
import {ScaleRecognizer} from '../../src/recognizers/scale_recognizer';
import {pointerEvent} from '../test_helpers';

describe('ScaleRecognizer & RotateRecognizer', () => {
  let arena: GestureArena;
  let stream: MotionEventStream;

  beforeEach(() => {
    arena = new GestureArena();
    stream = new MotionEventStream();
  });

  it('anchors smoothly at the spanSlop boundary without a first-frame zoom snap', () => {
    const onScaleStart = vi.fn();
    const onScale = vi.fn();
    const onScaleEnd = vi.fn();

    arena.add(
      new ScaleRecognizer({onScaleStart, onScale, onScaleEnd}, {spanSlop: 10, minSpan: 20})
    );

    // Initial distance = 90px; spanSlop = 10px -> anchorSpan = 100px!
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 90, clientY: 0, timeStamp: 0})
      )!
    );

    // Move within slop (span = 95): should not begin yet
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 95, clientY: 0, timeStamp: 10})
      )!
    );
    expect(onScaleStart).not.toHaveBeenCalled();

    // Expand to span = 200 -> anchored at 100 -> scale = 2.0, scaleFactor = 2.0
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 200, clientY: 0, timeStamp: 20})
      )!
    );
    expect(onScaleStart).toHaveBeenCalledWith(
      expect.objectContaining({scale: 1, scaleFactor: 1, currentSpan: 100, previousSpan: 100})
    );
    expect(onScale).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scale: 2.0,
        scaleFactor: 2.0,
        currentSpan: 200,
        previousSpan: 100,
        isQuickScale: false,
      })
    );

    // Expand further from 200 -> 300 -> cumulative scale = 3.0, incremental scaleFactor = 1.5
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 300, clientY: 0, timeStamp: 30})
      )!
    );
    expect(onScale).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scale: 3.0,
        scaleFactor: 1.5,
      })
    );

    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 300, clientY: 0, timeStamp: 40})
      )!
    );
    expect(onScaleEnd).toHaveBeenCalledTimes(1);
  });

  it('supports Android Quick-Scale and preserves scaleFactor === currentSpan / previousSpan', () => {
    const events: Array<{
      scale: number;
      scaleFactor: number;
      currentSpan: number;
      previousSpan: number;
    }> = [];
    arena.add(
      new ScaleRecognizer(
        {onScale: ev => events.push(ev)},
        {quickScale: true, quickScaleSensitivity: 100, spanSlop: 8}
      )
    );

    // First tap:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 100, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 100, timeStamp: 40})
      )!
    );

    // Second tap down at y=100 (quickSlop = 8 -> quickStartY = 108) + drag to y=208 (2.0x) and y=308 (4.0x):
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 100, timeStamp: 120})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 50, clientY: 208, timeStamp: 150})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 50, clientY: 308, timeStamp: 170})
      )!
    );

    expect(events).toHaveLength(2);
    expect(events[0].scale).toBeCloseTo(2.0, 4);
    expect(events[1].scale).toBeCloseTo(4.0, 4);
    for (const ev of events) {
      expect(ev.currentSpan).toBeGreaterThan(0);
      expect(ev.currentSpan / ev.previousSpan).toBeCloseTo(ev.scaleFactor, 6);
    }
  });

  it('unwraps rotation smoothly across the +/-180 degree branch cut without slop snap', () => {
    const rotations: number[] = [];
    arena.add(
      new RotateRecognizer(
        {
          onRotate: ev => rotations.push(ev.rotation),
        },
        {rotationSlop: 2, minSpan: 10}
      )
    );

    const setAngleDeg = (deg: number, timeStamp: number) => {
      const rad = (deg * Math.PI) / 180;
      const x = Math.cos(rad) * 100;
      const y = Math.sin(rad) * 100;
      arena.dispatch(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 2, clientX: x, clientY: y, timeStamp})
        )!
      );
    };

    // Start at +170 degrees (near +180 discontinuity)
    const startRad = (170 * Math.PI) / 180;
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {
          pointerId: 2,
          clientX: Math.cos(startRad) * 100,
          clientY: Math.sin(startRad) * 100,
          timeStamp: 0,
        })
      )!
    );

    // Rotate +15 degrees across +180 -> -175 degrees (post-slop = 13°), then +15 degrees -> -160 degrees (28°)
    setAngleDeg(-175, 16);
    setAngleDeg(-160, 32);

    expect(rotations.length).toBe(2);
    expect(rotations[0]).toBeCloseTo(13, 2);
    expect(rotations[1]).toBeCloseTo(28, 2);
  });

  it('covers Quick-Scale horizontal yield to Pan, Quick-Scale pointer_down cancel, minSpan completion, 3->2 re-anchor, and negative angle wrap', () => {
    const onPan = vi.fn();
    const onScaleStart = vi.fn();
    const onScaleEnd = vi.fn();
    const onScaleCancel = vi.fn();
    const onRotateEnd = vi.fn();
    const onRotateCancel = vi.fn();

    const scaleRec = new ScaleRecognizer(
      {onScaleStart, onScaleEnd, onScaleCancel},
      {quickScale: true, spanSlop: 8, minSpan: 30, simultaneousWithRotate: false}
    );
    const rotateRec = new RotateRecognizer(
      {onRotateEnd, onRotateCancel},
      {rotationSlop: 5, minSpan: 20, simultaneousWithScale: false}
    );
    arena.add(new PanRecognizer({onPan}, {slop: 6}));
    arena.add(scaleRec);
    arena.add(rotateRec);

    // 0. Tap followed by a distant 2nd tap (> doubleTapSlop) rejects Quick-Scale candidacy:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 20})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 300, clientY: 300, timeStamp: 80})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 300, clientY: 302, timeStamp: 90})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 300, clientY: 302, timeStamp: 100})
      )!
    );
    arena.reset();

    // 1. Tap then horizontal drag -> Quick-Scale yields immediately so horizontal Pan wins!
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 200})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 230})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 300})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 90, clientY: 52, timeStamp: 320})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 90, clientY: 52, timeStamp: 340})
      )!
    );
    expect(onPan).toHaveBeenCalled();

    // 2. Active Quick-Scale (`dt = 50ms >= doubleTapMinTime`, plus mouse Quick-Scale) triggers `onScaleStart` and is cancelled by 2nd finger (`POINTER_DOWN`):
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 350})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 370})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 420})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 1, clientX: 50, clientY: 120, timeStamp: 430})
      )!
    );
    expect(onScaleStart).toHaveBeenCalledTimes(1);
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 150, clientY: 120, timeStamp: 435})
      )!
    );
    expect(onScaleCancel).toHaveBeenCalledTimes(1);
    stream.reset();
    arena.reset();

    // Mouse double-press (`pointerType: 'mouse'`, `dt = 10ms`) also arms Quick-Scale without touch bounce delay:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {
          pointerId: 1,
          pointerType: 'mouse',
          clientX: 50,
          clientY: 50,
          timeStamp: 436,
        })
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {
          pointerId: 1,
          pointerType: 'mouse',
          clientX: 50,
          clientY: 50,
          timeStamp: 438,
        })
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {
          pointerId: 1,
          pointerType: 'mouse',
          clientX: 50,
          clientY: 50,
          timeStamp: 444,
        })
      )!
    );
    stream.reset();
    arena.reset();

    // Early 2-pointer `POINTER_UP` before Scale/Rotate activate transitions both to `FAILED`:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 450})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 100, clientY: 0, timeStamp: 452})
      )!
    );
    // Tiny pre-slop rotation (< 5°) and sub-minSpan move:
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 100, clientY: 2, timeStamp: 456})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 5, clientY: 0, timeStamp: 460})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 5, clientY: 0, timeStamp: 465})
      )!
    );
    stream.reset();
    arena.reset();

    // 3. 3-pointer Scale: 3->2 `POINTER_UP` re-anchors smoothly, then pinching below `minSpan` completes `onScaleEnd`:
    const arenaScale = new GestureArena();
    const scale3 = new ScaleRecognizer({onScaleEnd, onScaleCancel}, {spanSlop: 5, minSpan: 40});
    arenaScale.add(scale3);
    arenaScale.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 500})
      )!
    );
    arenaScale.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 100, clientY: 0, timeStamp: 502})
      )!
    );
    arenaScale.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 200, clientY: 0, timeStamp: 504})
      )!
    );
    arenaScale.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 3, clientX: 200, clientY: 0, timeStamp: 510})
      )!
    );
    arenaScale.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 150, clientY: 0, timeStamp: 520})
      )!
    );
    // Pinch inward below minSpan (40px) -> completes active scale:
    arenaScale.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 20, clientY: 0, timeStamp: 530})
      )!
    );
    expect(onScaleEnd).toHaveBeenCalledTimes(1);
    stream.reset();
    arenaScale.reset();

    // Synthetic 2-pointer DOWN & CANCEL on Scale:
    scale3.onMotionEvent(
      new MotionEvent({
        action: MotionAction.DOWN,
        downTime: 600,
        eventTime: 600,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [
          {pointerId: 1, x: 0, y: 0, pressure: 0.5},
          {pointerId: 2, x: 100, y: 0, pressure: 0.5},
        ],
        originalEvent: pointerEvent('pointerdown'),
      })
    );
    scale3.onMotionEvent(
      new MotionEvent({
        action: MotionAction.CANCEL,
        downTime: 600,
        eventTime: 610,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [],
        originalEvent: pointerEvent('pointercancel'),
      })
    );
    arenaScale.destroy();

    // 4. Rotate negative wrap-around (-170 -> +175 = -15°), 3->2 `POINTER_UP`, `UP` completion, and `CANCEL`:
    const negRotations: number[] = [];
    const arenaRot = new GestureArena();
    const rot = new RotateRecognizer(
      {
        onRotate: ev => negRotations.push(ev.rotation),
        onRotateEnd,
        onRotateCancel,
      },
      {rotationSlop: 2, minSpan: 10}
    );
    arenaRot.add(rot);

    const radNeg170 = (-170 * Math.PI) / 180;
    const radPos175 = (175 * Math.PI) / 180;
    arenaRot.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 700})
      )!
    );
    arenaRot.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {
          pointerId: 2,
          clientX: Math.cos(radNeg170) * 100,
          clientY: Math.sin(radNeg170) * 100,
          timeStamp: 700,
        })
      )!
    );
    arenaRot.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 50, clientY: 50, timeStamp: 702})
      )!
    );
    // Lift 3rd pointer -> 2 pointers remain -> re-anchors pair cleanly:
    arenaRot.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 3, clientX: 50, clientY: 50, timeStamp: 704})
      )!
    );
    // Stationary move (stepDeg === 0):
    arenaRot.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {
          pointerId: 2,
          clientX: Math.cos(radNeg170) * 100,
          clientY: Math.sin(radNeg170) * 100,
          timeStamp: 708,
        })
      )!
    );
    // Rotate -15° across -180° branch cut -> +175° (post-slop = -13°):
    arenaRot.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {
          pointerId: 2,
          clientX: Math.cos(radPos175) * 100,
          clientY: Math.sin(radPos175) * 100,
          timeStamp: 716,
        })
      )!
    );
    expect(negRotations[0]).toBeCloseTo(-13, 2);

    // Direct synthetic `UP` while active completes `onRotateEnd`, and `CANCEL` fires `onRotateCancel`:
    rot.onMotionEvent(
      new MotionEvent({
        action: MotionAction.UP,
        downTime: 700,
        eventTime: 720,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [{pointerId: 1, x: 0, y: 0, pressure: 0.5}],
        originalEvent: pointerEvent('pointerup'),
      })
    );
    expect(onRotateEnd).toHaveBeenCalledTimes(1);

    stream.reset();
    arenaRot.reset();
    arenaRot.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 800})
      )!
    );
    arenaRot.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 100, clientY: 0, timeStamp: 800})
      )!
    );
    arenaRot.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 0, clientY: 100, timeStamp: 810})
      )!
    );
    arenaRot.dispatch(
      stream.onPointerCancel(
        pointerEvent('pointercancel', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 820})
      )!
    );
    expect(onRotateCancel).toHaveBeenCalledTimes(1);

    // Synthetic `MOVE` with unanchored/swapped pointer IDs re-anchors `RotateRecognizer` safely:
    rot.reset();
    rot.onMotionEvent(
      new MotionEvent({
        action: MotionAction.MOVE,
        downTime: 900,
        eventTime: 900,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [
          {pointerId: 10, x: 0, y: 0, pressure: 0.5},
          {pointerId: 20, x: 100, y: 0, pressure: 0.5},
        ],
        originalEvent: pointerEvent('pointermove'),
      })
    );
    rot.onMotionEvent(
      new MotionEvent({
        action: MotionAction.MOVE,
        downTime: 900,
        eventTime: 910,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [
          {pointerId: 10, x: 0, y: 0, pressure: 0.5},
          {pointerId: 30, x: 0, y: 100, pressure: 0.5},
        ],
        originalEvent: pointerEvent('pointermove'),
      })
    );
    arenaRot.destroy();
  });
});
