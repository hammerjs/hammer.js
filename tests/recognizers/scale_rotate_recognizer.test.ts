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

    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 95, clientY: 0, timeStamp: 10})
      )!
    );
    expect(onScaleStart).not.toHaveBeenCalled();

    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 200, clientY: 0, timeStamp: 20})
      )!
    );
    expect(onScaleStart).toHaveBeenCalledWith(
      expect.objectContaining({scale: 1, scaleFactor: 1, isQuickScale: false})
    );
    expect(onScale).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scale: 2.0,
        scaleFactor: 2.0,
        isQuickScale: false,
      })
    );

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

    // Starting closer than minSpan (20px) anchors at minSpan + spanSlop (30px).
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
      expect.objectContaining({scale: 2.0, scaleFactor: 2.0, isQuickScale: false})
    );
  });

  it('supports standalone QuickScaleRecognizer and computes incremental scaleFactor', () => {
    const events: Array<{
      scale: number;
      scaleFactor: number;
      isQuickScale: boolean;
    }> = [];
    arena.add(
      new QuickScaleRecognizer({onScale: ev => events.push(ev)}, {sensitivity: 100, slop: 8})
    );

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
    expect(events[0].scaleFactor).toBeCloseTo(2.0, 4);
    expect(events[0].isQuickScale).toBe(true);
    expect(events[1].scale).toBeCloseTo(4.0, 4);
    expect(events[1].scaleFactor).toBeCloseTo(2.0, 4);
    expect(events[1].isQuickScale).toBe(true);
  });

  it('unwraps rotation smoothly across the +/-180 degree branch cut and ignores close-proximity angle drift', () => {
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
    setAngleDeg(90, 10, 10);
    setAngleDeg(90, 100, 20);
    expect(rotations).toHaveLength(0);

    stream.reset();
    arena.reset();

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

    setAngleDeg(-175, 100, 116);
    setAngleDeg(-160, 100, 132);

    expect(rotations.length).toBe(2);
    expect(rotations[0]).toBeCloseTo(13, 2);
    expect(rotations[1]).toBeCloseTo(28, 2);
  });

  it('covers QuickScale horizontal yield to Pan, pointer_down cancel, sub-minSpan pinch recovery, 3->2 re-anchor, and negative angle wrap', () => {
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

    const scale3Values: number[] = [];
    const arenaScale = new GestureArena();
    const scale3 = new ScaleRecognizer(
      {onScale: ev => scale3Values.push(ev.scale), onScaleEnd, onScaleCancel},
      {spanSlop: 5, minSpan: 40}
    );
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
    // Pinching below minSpan (40px) clamps at minSpan without killing the active gesture:
    arenaScale.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 20, clientY: 0, timeStamp: 530})
      )!
    );
    arenaScale.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 10, clientY: 0, timeStamp: 535})
      )!
    );
    expect(onScaleEnd).not.toHaveBeenCalled();
    expect(scale3.active).toBe(true);
    // Spreading back out past minSpan resumes scaling seamlessly without lifting fingers:
    arenaScale.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 105, clientY: 0, timeStamp: 540})
      )!
    );
    expect(scale3Values.at(-1)).toBeCloseTo(1.0, 5);
    arenaScale.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 105, clientY: 0, timeStamp: 545})
      )!
    );
    expect(onScaleEnd).toHaveBeenCalledTimes(1);
    stream.reset();
    arenaScale.reset();

    scale3.onMotionEvent(
      new MotionEvent({
        action: MotionAction.DOWN,
        eventTime: 600,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [
          {pointerId: 1, x: 0, y: 0},
          {pointerId: 2, x: 100, y: 0},
        ],
        originalEvent: pointerEvent('pointerdown'),
      })
    );
    scale3.onMotionEvent(
      new MotionEvent({
        action: MotionAction.MOVE,
        eventTime: 605,
        actionIndex: 1,
        pointerType: 'touch',
        pointers: [
          {pointerId: 1, x: 0, y: 0},
          {pointerId: 2, x: 150, y: 0},
        ],
        originalEvent: pointerEvent('pointermove'),
      })
    );
    scale3.onMotionEvent(
      new MotionEvent({
        action: MotionAction.POINTER_UP,
        eventTime: 610,
        actionIndex: 1,
        pointerType: 'touch',
        pointers: [
          {pointerId: 1, x: 0, y: 0},
          {pointerId: 2, x: 150, y: 0},
        ],
        originalEvent: pointerEvent('pointerup'),
      })
    );
    expect(onScaleEnd).toHaveBeenCalledTimes(2);

    scale3.reset();
    scale3.onMotionEvent(
      new MotionEvent({
        action: MotionAction.CANCEL,
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
        eventTime: 615,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [],
        originalEvent: pointerEvent('pointercancel'),
      })
    );
    arenaScale.destroy();

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

    rot.reset();
    rot.onMotionEvent(
      new MotionEvent({
        action: MotionAction.MOVE,
        eventTime: 900,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [
          {pointerId: 10, x: 0, y: 0},
          {pointerId: 20, x: 100, y: 0},
        ],
        originalEvent: pointerEvent('pointermove'),
      })
    );
    rot.onMotionEvent(
      new MotionEvent({
        action: MotionAction.MOVE,
        eventTime: 910,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [
          {pointerId: 10, x: 0, y: 0},
          {pointerId: 30, x: 0, y: 100},
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

      arena.dispatch(
        stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, timeStamp: 0}))!
      );
      vi.advanceTimersByTime(arena.config.maxTapDuration + 1);
      expect(quickScale.state).toBe('failed');
      arena.dispatch(
        stream.onPointerUp(pointerEvent('pointerup', {pointerId: 1, timeStamp: 300}))!
      );

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

  it('handles sub-minSpan 3->2 re-anchors without zoom spikes, active sub-minSpan rotation re-anchors, and multi-pointer QuickScale rejection', () => {
    const scaleFactors: number[] = [];
    const scaleRec = new ScaleRecognizer(
      {onScale: ev => scaleFactors.push(ev.scaleFactor)},
      {spanSlop: 5, minSpan: 30}
    );
    arena.add(scaleRec);

    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 2, clientY: 0, timeStamp: 2})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 120, clientY: 0, timeStamp: 4})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 3, clientX: 180, clientY: 0, timeStamp: 16})
      )!
    );
    expect(scaleRec.active).toBe(true);

    // Lifting pointer 3 leaves pointers 1 and 2 only 2px apart (< minSpan 30px).
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 3, clientX: 180, clientY: 0, timeStamp: 24})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 33, clientY: 0, timeStamp: 32})
      )!
    );
    expect(scaleFactors.at(-1)).toBeCloseTo(33 / 30, 3);

    stream.reset();
    arena.destroy();

    const rotDeltas: number[] = [];
    const rotArena = new GestureArena();
    rotArena.add(
      new RotateRecognizer(
        {onRotate: ev => rotDeltas.push(ev.rotationDelta)},
        {rotationSlop: 2, minSpan: 25}
      )
    );
    rotArena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 100})
      )!
    );
    rotArena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 100, clientY: 0, timeStamp: 100})
      )!
    );
    rotArena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 0, clientY: 100, timeStamp: 116})
      )!
    );
    expect(rotDeltas).toEqual([88]);

    // Pinching below minSpan and spreading back out at a new angle re-anchors without snapping.
    rotArena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 5, clientY: 0, timeStamp: 132})
      )!
    );
    rotArena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: -100, clientY: 0, timeStamp: 148})
      )!
    );
    expect(rotDeltas).toEqual([88]);
    rotArena.destroy();

    const qs = new QuickScaleRecognizer({});
    qs.onMotionEvent(
      new MotionEvent({
        action: MotionAction.DOWN,
        eventTime: 0,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [
          {pointerId: 1, x: 0, y: 0},
          {pointerId: 2, x: 20, y: 0},
        ],
        originalEvent: pointerEvent('pointerdown'),
      })
    );
    expect(qs.state).toBe('failed');
  });
});
