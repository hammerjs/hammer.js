import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {GestureArena} from '../../src/gesture_arena';
import {MotionAction, MotionEvent, MotionEventStream} from '../../src/motion_event';
import {PanRecognizer} from '../../src/recognizers/pan_recognizer';
import {QuickScaleRecognizer} from '../../src/recognizers/quick_scale_recognizer';
import {RotateRecognizer} from '../../src/recognizers/rotate_recognizer';
import {ScaleRecognizer} from '../../src/recognizers/scale_recognizer';
import {pointerEvent} from '../test_helpers';

describe('ScaleRecognizer, QuickScaleRecognizer & RotateRecognizer', () => {
  let arena: GestureArena;
  let stream: MotionEventStream;

  beforeEach(() => {
    arena = new GestureArena();
    stream = new MotionEventStream();
  });

  afterEach(() => {
    arena.destroy();
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

    // Starting 2 fingers closer than `minSpan` (0px < 20px) and expanding to 60px anchors at `minSpan + spanSlop` (30px -> scale = 2.0) instead of exploding:
    stream.reset();
    arena.reset();
    onScaleStart.mockClear();
    onScale.mockClear();
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 100})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 0, clientY: 0, timeStamp: 100})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 10, clientY: 0, timeStamp: 110})
      )!
    );
    expect(onScaleStart).not.toHaveBeenCalled();
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 60, clientY: 0, timeStamp: 120})
      )!
    );
    expect(onScale).toHaveBeenLastCalledWith(
      expect.objectContaining({scale: 2.0, previousSpan: 30, currentSpan: 60})
    );
  });

  it('supports standalone QuickScaleRecognizer and preserves scaleFactor === currentSpan / previousSpan', () => {
    const events: Array<{
      scale: number;
      scaleFactor: number;
      currentSpan: number;
      previousSpan: number;
      isQuickScale: boolean;
    }> = [];
    arena.add(
      new QuickScaleRecognizer({onScale: ev => events.push(ev)}, {sensitivity: 100, slop: 8})
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

    // Second tap down at y=100 (slop = 8 -> startY = 108) + drag to y=208 (2.0x) and y=308 (4.0x):
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
      expect(ev.isQuickScale).toBe(true);
      expect(ev.currentSpan).toBeGreaterThan(0);
      expect(ev.currentSpan / ev.previousSpan).toBeCloseTo(ev.scaleFactor, 6);
    }
  });

  it('unwraps rotation smoothly across the +/-180 degree branch cut and never snaps after close-proximity (< minSpan) angle drift', () => {
    const rotations: number[] = [];
    arena.add(
      new RotateRecognizer(
        {
          onRotate: ev => rotations.push(ev.rotation),
        },
        {rotationSlop: 2, minSpan: 27}
      )
    );

    const setAngleDeg = (deg: number, radius: number, timeStamp: number) => {
      const rad = (deg * Math.PI) / 180;
      const x = Math.cos(rad) * radius;
      const y = Math.sin(rad) * radius;
      arena.dispatch(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 2, clientX: x, clientY: y, timeStamp})
        )!
      );
    };

    // 1. Two fingers start close together (10px < minSpan=27px) at 0 deg, shift to 90 deg while still 10px apart,
    //    then pinch straight outward along 90 deg to 100px: MUST NOT snap 88 deg!
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 10, clientY: 0, timeStamp: 0})
      )!
    );
    setAngleDeg(90, 10, 10); // still < minSpan (27px): re-anchors pair to 90 deg!
    setAngleDeg(90, 100, 20); // expands straight out along 90 deg -> 0 deg rotation!
    expect(rotations).toHaveLength(0);

    stream.reset();
    arena.reset();

    // 2. Start at +170 degrees (near +180 discontinuity) at radius 100:
    const startRad = (170 * Math.PI) / 180;
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 100})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {
          pointerId: 2,
          clientX: Math.cos(startRad) * 100,
          clientY: Math.sin(startRad) * 100,
          timeStamp: 100,
        })
      )!
    );

    // Rotate +15 degrees across +180 -> -175 degrees (post-slop = 13 deg), then +15 degrees -> -160 degrees (28 deg)
    setAngleDeg(-175, 100, 116);
    setAngleDeg(-160, 100, 132);

    expect(rotations.length).toBe(2);
    expect(rotations[0]).toBeCloseTo(13, 2);
    expect(rotations[1]).toBeCloseTo(28, 2);
  });

  it('covers QuickScale horizontal yield to Pan, pointer_down cancel, minSpan completion, 3->2 re-anchor, and negative angle wrap', () => {
    const onPan = vi.fn();
    const onScaleStart = vi.fn();
    const onScaleEnd = vi.fn();
    const onScaleCancel = vi.fn();
    const onRotateEnd = vi.fn();
    const onRotateCancel = vi.fn();

    const quickScaleRec = new QuickScaleRecognizer(
      {onScaleStart, onScaleEnd, onScaleCancel},
      {slop: 8}
    );
    const scaleRec = new ScaleRecognizer(
      {onScaleStart, onScaleEnd, onScaleCancel},
      {spanSlop: 8, minSpan: 30}
    );
    const rotateRec = new RotateRecognizer(
      {onRotateEnd, onRotateCancel},
      {rotationSlop: 5, minSpan: 20}
    );
    arena.add(new PanRecognizer({onPan}, {slop: 6}));
    arena.add(quickScaleRec);
    arena.add(scaleRec);
    arena.add(rotateRec);

    // 0. Tap followed by a distant 2nd tap (> doubleTapSlop) rejects QuickScale candidacy:
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

    // 1. Tap then horizontal drag -> QuickScale yields immediately so horizontal Pan wins!
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

    // 2. Active QuickScale (`dt = 50ms >= doubleTapMinTime`, plus mouse QuickScale) triggers `onScaleStart` and is cancelled by 2nd finger (`POINTER_DOWN`):
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

    // Mouse double-press (`pointerType: 'mouse'`, `dt = 10ms`) also arms QuickScale without touch bounce delay:
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
    arenaScale.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 20, clientY: 0, timeStamp: 530})
      )!
    );
    expect(onScaleEnd).toHaveBeenCalledTimes(1);
    stream.reset();
    arenaScale.reset();

    // Synthetic 2-pointer DOWN, POINTER_UP while active, & CANCEL on Scale and QuickScale:
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
        action: MotionAction.MOVE,
        downTime: 600,
        eventTime: 605,
        actionIndex: 1,
        pointerType: 'touch',
        pointers: [
          {pointerId: 1, x: 0, y: 0, pressure: 0.5},
          {pointerId: 2, x: 150, y: 0, pressure: 0.5},
        ],
        originalEvent: pointerEvent('pointermove'),
      })
    );
    scale3.onMotionEvent(
      new MotionEvent({
        action: MotionAction.POINTER_UP,
        downTime: 600,
        eventTime: 610,
        actionIndex: 1,
        pointerType: 'touch',
        pointers: [
          {pointerId: 1, x: 0, y: 0, pressure: 0.5},
          {pointerId: 2, x: 150, y: 0, pressure: 0.5},
        ],
        originalEvent: pointerEvent('pointerup'),
      })
    );
    expect(onScaleEnd).toHaveBeenCalledTimes(2);

    scale3.reset();
    scale3.onMotionEvent(
      new MotionEvent({
        action: MotionAction.CANCEL,
        downTime: 600,
        eventTime: 615,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [],
        originalEvent: pointerEvent('pointercancel'),
      })
    );
    quickScaleRec.onMotionEvent(
      new MotionEvent({
        action: MotionAction.CANCEL,
        downTime: 600,
        eventTime: 615,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [],
        originalEvent: pointerEvent('pointercancel'),
      })
    );
    arenaScale.destroy();

    // 4. Rotate negative wrap-around (-170 -> +175 = -15 deg), 3->2 `POINTER_UP`, `UP` completion, and `CANCEL`:
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
    arenaRot.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 3, clientX: 50, clientY: 50, timeStamp: 704})
      )!
    );
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

    arenaRot.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {
          pointerId: 2,
          clientX: Math.cos(radPos175) * 100,
          clientY: Math.sin(radPos175) * 100,
          timeStamp: 720,
        })
      )!
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

  it('fails QuickScale when the first stroke is held longer than a tap, and never scales against the drag direction', () => {
    vi.useFakeTimers();
    try {
      const onScaleStart = vi.fn();
      const scales: number[] = [];
      const quickScale = new QuickScaleRecognizer(
        {onScaleStart, onScale: ev => scales.push(ev.scale)},
        {slop: 8}
      );
      arena.add(quickScale);

      // 1. First stroke held past `maxTapDuration` fails immediately (timer):
      arena.dispatch(
        stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, timeStamp: 0}))!
      );
      vi.advanceTimersByTime(arena.config.maxTapDuration + 1);
      expect(quickScale.state).toBe('failed');
      arena.dispatch(
        stream.onPointerUp(pointerEvent('pointerup', {pointerId: 1, timeStamp: 300}))!
      );

      // 2. Tap, then press and drag mostly-down with |dy| < slop at the slop crossing:
      arena.dispatch(
        stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, timeStamp: 1000}))!
      );
      arena.dispatch(
        stream.onPointerUp(pointerEvent('pointerup', {pointerId: 1, timeStamp: 1050}))!
      );
      arena.dispatch(
        stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, timeStamp: 1150}))!
      );
      arena.dispatch(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 6, clientY: 7, timeStamp: 1166})
        )!
      );
      expect(onScaleStart).toHaveBeenCalledTimes(1);
      arena.dispatch(
        stream.onPointerMove(
          pointerEvent('pointermove', {pointerId: 1, clientX: 6, clientY: 40, timeStamp: 1182})
        )!
      );
      expect(scales.length).toBeGreaterThan(0);
      expect(scales.every(scale => scale >= 1)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
