import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {GestureArena} from '../../src/gesture_arena';
import {MotionEvent} from '../../src/motion_event';
import {MotionEventStream} from '../../src/motion_event_stream';
import {PanRecognizer} from '../../src/recognizers/pan_recognizer';
import {QuickScaleRecognizer} from '../../src/recognizers/quick_scale_recognizer';
import {RotateRecognizer} from '../../src/recognizers/rotate_recognizer';
import {ScaleRecognizer} from '../../src/recognizers/scale_recognizer';
import {pointerEvent} from '../test_helpers';

describe('ScaleRecognizer, QuickScaleRecognizer & RotateRecognizer', () => {
  let arena: GestureArena | undefined;
  let stream: MotionEventStream;

  beforeEach(() => {
    arena = undefined;
    stream = new MotionEventStream();
  });

  afterEach(() => {
    arena?.destroy();
  });

  it('anchors smoothly at the spanSlop boundary without a first-frame zoom snap', () => {
    const onScaleStart = vi.fn();
    const onScale = vi.fn();
    const onScaleEnd = vi.fn();

    arena = new GestureArena([
      new ScaleRecognizer({onScaleStart, onScale, onScaleEnd}, {spanSlop: 10, minSpan: 20}),
    ]);

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
    expect(onScaleEnd).toHaveBeenLastCalledWith(
      expect.objectContaining({
        center: {x: 150, y: 0},
      })
    );

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
    arena = new GestureArena([
      new QuickScaleRecognizer({onScale: ev => events.push(ev)}, {sensitivity: 100, slop: 8}),
    ]);

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
    const rotArena = new GestureArena([
      new RotateRecognizer(
        {
          onRotate: ev => rotations.push(ev.rotation),
        },
        {rotationSlop: 2, minSpan: 27}
      ),
    ]);
    arena = rotArena;

    const setAngleDeg = (deg: number, radius: number, timeStamp: number) => {
      const rad = (deg * Math.PI) / 180;
      const x = Math.cos(rad) * radius;
      const y = Math.sin(rad) * radius;
      rotArena.dispatch(
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

  it('handles QuickScale distant second tap, horizontal yield to Pan, pointer_down cancel, and mouse double-click', () => {
    const onPan = vi.fn();
    const onScaleStart = vi.fn();
    const onScaleEnd = vi.fn();
    const onScaleCancel = vi.fn();

    const quickScaleRec = new QuickScaleRecognizer(
      {onScaleStart, onScaleEnd, onScaleCancel},
      {slop: 8}
    );
    arena = new GestureArena([new PanRecognizer({onPan}, {slop: 6}), quickScaleRec]);

    // Distant second tap fails QuickScale instead of arming:
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
    expect(quickScaleRec.isPrioritized).toBe(false);
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
    expect(onScaleStart).not.toHaveBeenCalled();
    arena.reset();

    // Horizontal drag on the second tap yields to PanRecognizer:
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
    expect(onScaleStart).not.toHaveBeenCalled();

    // Adding a second finger mid-QuickScale cancels it:
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

    // Fast mouse double-click (< 40ms) is not rejected by touch bounce filtering:
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
    expect(quickScaleRec.state).toBe('possible');

    quickScaleRec.onMotionEvent(
      new MotionEvent({
        action: 'cancel',
        eventTime: 450,
        actionIndex: 0,
        pointerType: 'mouse',
        pointers: [],
        originalEvent: pointerEvent('pointercancel'),
      })
    );
    expect(quickScaleRec.state).toBe('cancelled');
  });

  it('handles ScaleRecognizer sub-minSpan clamping/recovery, 3->2 re-anchor, and cancel', () => {
    const onScaleEnd = vi.fn();
    const onScaleCancel = vi.fn();
    const scale3Values: number[] = [];
    const scale3 = new ScaleRecognizer(
      {onScale: ev => scale3Values.push(ev.scale), onScaleEnd, onScaleCancel},
      {spanSlop: 5, minSpan: 40}
    );
    arena = new GestureArena([scale3]);

    // Pinching below minSpan before exceeding spanSlop and lifting does not start scaling:
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
    expect(scale3Values).toHaveLength(0);
    stream.reset();
    arena.reset();

    // 3->2 finger lift re-anchors, and pinching below minSpan (40px) clamps without ending:
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 500})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 100, clientY: 0, timeStamp: 502})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 200, clientY: 0, timeStamp: 504})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 3, clientX: 200, clientY: 0, timeStamp: 510})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 150, clientY: 0, timeStamp: 520})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 20, clientY: 0, timeStamp: 530})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 10, clientY: 0, timeStamp: 535})
      )!
    );
    expect(onScaleEnd).not.toHaveBeenCalled();
    expect(scale3.active).toBe(true);
    // Spreading back out past minSpan resumes scaling seamlessly without lifting fingers:
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 105, clientY: 0, timeStamp: 540})
      )!
    );
    expect(scale3Values.at(-1)).toBeCloseTo(1.0, 5);
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 2, clientX: 105, clientY: 0, timeStamp: 545})
      )!
    );
    expect(onScaleEnd).toHaveBeenCalledTimes(1);
    stream.reset();
    arena.reset();

    // Synthetic multi-pointer down -> move -> pointer_up completes cleanly:
    scale3.onMotionEvent(
      new MotionEvent({
        action: 'down',
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
        action: 'move',
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
        action: 'pointer_up',
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
        action: 'cancel',
        eventTime: 615,
        actionIndex: 0,
        pointerType: 'touch',
        pointers: [],
        originalEvent: pointerEvent('pointercancel'),
      })
    );
    expect(scale3.state).toBe('cancelled');
  });

  it('handles RotateRecognizer negative angle wrap, 3->2 re-anchor, cancel, and pointer-id swap', () => {
    const onRotateEnd = vi.fn();
    const onRotateCancel = vi.fn();
    const negRotations: number[] = [];
    const rot = new RotateRecognizer(
      {
        onRotate: ev => negRotations.push(ev.rotation),
        onRotateEnd,
        onRotateCancel,
      },
      {rotationSlop: 2, minSpan: 10}
    );
    arena = new GestureArena([rot]);

    const radNeg170 = (-170 * Math.PI) / 180;
    const radPos175 = (175 * Math.PI) / 180;
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 700})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {
          pointerId: 2,
          clientX: Math.cos(radNeg170) * 100,
          clientY: Math.sin(radNeg170) * 100,
          timeStamp: 700,
        })
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 50, clientY: 50, timeStamp: 702})
      )!
    );
    arena.dispatch(
      stream.onPointerUp(
        pointerEvent('pointerup', {pointerId: 3, clientX: 50, clientY: 50, timeStamp: 704})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {
          pointerId: 2,
          clientX: Math.cos(radNeg170) * 100,
          clientY: Math.sin(radNeg170) * 100,
          timeStamp: 708,
        })
      )!
    );
    arena.dispatch(
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

    arena.dispatch(
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
    const endCenter = onRotateEnd.mock.calls[0][0].center;
    expect(endCenter.x).toBeCloseTo(Math.cos(radPos175) * 50, 3);
    expect(endCenter.y).toBeCloseTo(Math.sin(radPos175) * 50, 3);

    stream.reset();
    arena.reset();
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 800})
      )!
    );
    arena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 100, clientY: 0, timeStamp: 800})
      )!
    );
    arena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 0, clientY: 100, timeStamp: 810})
      )!
    );
    arena.dispatch(
      stream.onPointerCancel(
        pointerEvent('pointercancel', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 820})
      )!
    );
    expect(onRotateCancel).toHaveBeenCalledTimes(1);

    // Swapping pointer IDs mid-move re-anchors the baseline angle instead of emitting a 90deg snap:
    const countBeforeSwap = negRotations.length;
    rot.reset();
    rot.onMotionEvent(
      new MotionEvent({
        action: 'move',
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
        action: 'move',
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
    expect(negRotations.length).toBe(countBeforeSwap);
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
      arena = new GestureArena([quickScale]);

      arena.dispatch(
        stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, timeStamp: 0}))!
      );
      vi.advanceTimersByTime(251);
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
    arena = new GestureArena([scaleRec]);

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
    const rotArena = new GestureArena([
      new RotateRecognizer(
        {onRotate: ev => rotDeltas.push(ev.rotationDelta)},
        {rotationSlop: 2, minSpan: 25}
      ),
    ]);
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
        action: 'down',
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

  it('avoids false zoom-ins when span dips below minSpan and returns to initialSpan', () => {
    const scales: number[] = [];
    const pinchArena = new GestureArena([
      new ScaleRecognizer({onScale: ev => scales.push(ev.scale)}, {spanSlop: 16, minSpan: 27}),
    ]);

    // Dipping `45 -> 20 (< minSpan 27) -> 45` must NOT overwrite `initialSpan` to `20` and fire a bogus zoom-in:
    pinchArena.dispatch(
      stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, clientX: 0, timeStamp: 0}))!
    );
    pinchArena.dispatch(
      stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 2, clientX: 45, timeStamp: 2}))!
    );
    pinchArena.dispatch(
      stream.onPointerMove(pointerEvent('pointermove', {pointerId: 2, clientX: 20, timeStamp: 16}))!
    );
    pinchArena.dispatch(
      stream.onPointerMove(pointerEvent('pointermove', {pointerId: 2, clientX: 45, timeStamp: 32}))!
    );
    expect(scales).toEqual([]);
    pinchArena.dispatch(
      stream.onPointerUp(pointerEvent('pointerup', {pointerId: 2, clientX: 45, timeStamp: 40}))!
    );
    pinchArena.dispatch(
      stream.onPointerUp(pointerEvent('pointerup', {pointerId: 1, clientX: 0, timeStamp: 45}))!
    );

    // Subsequent pinch-in from `60 -> 30` (`>= minSpan 27`) recognizes zoom-out cleanly:
    pinchArena.dispatch(
      stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, clientX: 0, timeStamp: 100}))!
    );
    pinchArena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 60, timeStamp: 102})
      )!
    );
    pinchArena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 30, timeStamp: 116})
      )!
    );
    expect(scales).toHaveLength(1);
    expect(scales[0]).toBeCloseTo(30 / 44, 3);
    pinchArena.destroy();
  });

  it('ignores sub-slop rotation jitter and stops rotating if the arena denies its claim', () => {
    const onRotate = vi.fn();
    const onScale = vi.fn();
    // Scale and Rotate NOT marked simultaneous: Scale wins first, so Rotate's claim is denied.
    const competingArena = new GestureArena([
      new ScaleRecognizer({onScale}, {spanSlop: 5, minSpan: 10}),
      new RotateRecognizer({onRotate}, {rotationSlop: 5, minSpan: 10}),
    ]);

    competingArena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
      )!
    );
    competingArena.dispatch(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 100, clientY: 0, timeStamp: 0})
      )!
    );
    // Tiny 1-degree rotation below `rotationSlop: 5` (and small span change below `spanSlop: 5`):
    const rad1 = (1 * Math.PI) / 180;
    competingArena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {
          pointerId: 2,
          clientX: Math.cos(rad1) * 100,
          clientY: Math.sin(rad1) * 100,
          timeStamp: 10,
        })
      )!
    );
    expect(onRotate).not.toHaveBeenCalled();

    // Large pinch + rotation: Scale wins first (registered first), denying Rotate's claim:
    competingArena.dispatch(
      stream.onPointerMove(
        pointerEvent('pointermove', {pointerId: 2, clientX: 0, clientY: 200, timeStamp: 20})
      )!
    );
    expect(onScale).toHaveBeenCalledWith(expect.objectContaining({pointerType: 'touch'}));
    expect(onRotate).not.toHaveBeenCalled();
    competingArena.destroy();
  });
});
