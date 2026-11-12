import {describe, it, expect, beforeEach} from 'vitest';
import {MotionAction, MotionEvent, MotionEventStream} from '../src/motion_event';
import {pointerEvent} from './test_helpers';

describe('MotionEvent & MotionEventStream', () => {
  let stream: MotionEventStream;

  beforeEach(() => {
    stream = new MotionEventStream();
  });

  it('transitions through DOWN -> POINTER_DOWN -> MOVE -> POINTER_UP -> UP', () => {
    const down1 = stream.onPointerDown(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 100, clientY: 100, timeStamp: 10})
    )!;
    expect(down1.action).toBe(MotionAction.DOWN);
    expect(down1.pointers.length).toBe(1);
    expect(down1.activePointerCount).toBe(1);
    expect(down1.focus).toEqual({x: 100, y: 100});
    expect(stream.activePointerType).toBe('touch');

    const down2 = stream.onPointerDown(
      pointerEvent('pointerdown', {pointerId: 2, clientX: 200, clientY: 100, timeStamp: 20})
    )!;
    expect(down2.action).toBe(MotionAction.POINTER_DOWN);
    expect(down2.pointers.length).toBe(2);
    expect(down2.activePointerCount).toBe(2);
    expect(down2.actionPointerId).toBe(2);
    expect(down2.focus).toEqual({x: 150, y: 100});
    expect(down2.getSpan()).toBeCloseTo(100);

    const move = stream.onPointerMove(
      pointerEvent('pointermove', {pointerId: 2, clientX: 300, clientY: 100, timeStamp: 30})
    )!;
    expect(move.action).toBe(MotionAction.MOVE);
    expect(move.focus).toEqual({x: 200, y: 100});
    expect(move.getSpan()).toBeCloseTo(200);

    const up1 = stream.onPointerUp(
      pointerEvent('pointerup', {pointerId: 1, clientX: 100, clientY: 100, timeStamp: 40})
    )!;
    expect(up1.action).toBe(MotionAction.POINTER_UP);
    expect(up1.pointers.length).toBe(2);
    expect(up1.activePointerCount).toBe(1);
    expect(up1.actionPointerId).toBe(1);
    expect(up1.focus).toEqual({x: 300, y: 100});

    const up2 = stream.onPointerUp(
      pointerEvent('pointerup', {pointerId: 2, clientX: 300, clientY: 100, timeStamp: 50})
    )!;
    expect(up2.action).toBe(MotionAction.UP);
    expect(up2.activePointerCount).toBe(0);
    expect(up2.focus).toEqual({x: 300, y: 100});
    expect(stream.activePointerType).toBeNull();
  });

  it('ignores unpressed hover moves, non-primary mouse buttons, macOS Ctrl+Click, and detects swallowed mouse release', () => {
    expect(
      stream.onPointerMove(pointerEvent('pointermove', {pointerId: 1, pointerType: 'mouse'}))
    ).toBeNull();

    expect(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, pointerType: 'mouse', button: 2})
      )
    ).toBeNull();

    expect(
      stream.onPointerDown(
        pointerEvent('pointerdown', {pointerId: 1, pointerType: 'pen', button: 2})
      )
    ).toBeNull();

    expect(
      stream.onPointerDown(
        pointerEvent('pointerdown', {
          pointerId: 1,
          pointerType: 'mouse',
          button: 0,
          ctrlKey: true,
        })
      )
    ).toBeNull();

    stream.onPointerDown(
      pointerEvent('pointerdown', {pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1})
    );
    expect(
      stream.hasReleasedMouseButton(
        pointerEvent('pointermove', {pointerId: 1, pointerType: 'mouse', buttons: 1})
      )
    ).toBe(false);
    expect(
      stream.hasReleasedMouseButton(
        pointerEvent('pointermove', {pointerId: 1, pointerType: 'mouse', buttons: 0})
      )
    ).toBe(true);
  });

  it('extracts coalesced pointer events strictly for the moving actionIndex pointer', () => {
    stream.onPointerDown(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0})
    );
    stream.onPointerDown(
      pointerEvent('pointerdown', {pointerId: 2, clientX: 100, clientY: 50, timeStamp: 2})
    );

    const c1 = pointerEvent('pointermove', {
      pointerId: 2,
      clientX: 110,
      clientY: 55,
      timeStamp: 4,
    });
    const c2 = pointerEvent('pointermove', {
      pointerId: 2,
      clientX: 120,
      clientY: 60,
      timeStamp: 8,
    });
    const c3 = pointerEvent('pointermove', {
      pointerId: 2,
      clientX: 130,
      clientY: 65,
      timeStamp: 12,
    });

    const move = stream.onPointerMove(
      pointerEvent('pointermove', {
        pointerId: 2,
        clientX: 130,
        clientY: 65,
        timeStamp: 12,
        coalescedEvents: [c1, c2, c3],
      })
    )!;

    expect(move.actionIndex).toBe(1);
    expect(move.history).toHaveLength(2);
    expect(move.history[0]).toEqual({eventTime: 4, x: 110, y: 55});
    expect(move.history[1]).toEqual({eventTime: 8, x: 120, y: 60});
    expect(move.pointers[1].x).toBe(130);
    expect(move.pointers[0].x).toBe(0);
  });

  it('aborts all active pointers on CANCEL', () => {
    stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0}));
    stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 2, clientX: 50, clientY: 50}));

    const cancel = stream.onPointerCancel(pointerEvent('pointercancel', {pointerId: 1}))!;
    expect(cancel.action).toBe(MotionAction.CANCEL);
    expect(cancel.activePointerCount).toBe(0);
    expect(stream.activePointerCount).toBe(0);
  });

  it('computes multi-pointer mean-deviation span across 3 pointers', () => {
    stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 1, clientX: -60, clientY: 0}));
    stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 2, clientX: 0, clientY: 0}));
    const ev = stream.onPointerDown(
      pointerEvent('pointerdown', {pointerId: 3, clientX: 60, clientY: 0})
    )!;

    expect(ev.focus).toEqual({x: 0, y: 0});
    expect(ev.getSpan()).toBeCloseTo(80);
  });

  it('covers findPointerIndex, spans, stream queries, and raw Event fallbacks', () => {
    const down1 = stream.onPointerDown(
      pointerEvent('pointerdown', {
        pointerId: 10,
        clientX: 0,
        clientY: 0,
        timeStamp: 5,
      })
    )!;
    expect(down1.findPointerIndex(10)).toBe(0);
    expect(down1.findPointerIndex(999)).toBe(-1);
    expect(down1.getSpan()).toBe(0);

    const down2 = stream.onPointerDown(
      pointerEvent('pointerdown', {
        pointerId: 20,
        clientX: 0,
        clientY: 100,
        timeStamp: 10,
      })
    )!;
    expect(down2.getSpan()).toBeCloseTo(100);
    expect([...stream.activePointerIds]).toContain(20);

    expect(stream.onPointerUp(pointerEvent('pointerup', {pointerId: 777}))).toBeNull();
    expect(stream.onPointerCancel(pointerEvent('pointercancel', {pointerId: 777}))).toBeNull();

    stream.reset();
    expect(stream.activePointerCount).toBe(0);
    const rawEv = pointerEvent('pointerdown', {
      pointerId: 5,
      clientX: 15,
      clientY: 25,
      pointerType: '',
      timeStamp: 5,
    });
    const fallbackDown = stream.onPointerDown(rawEv)!;
    expect(fallbackDown.pointerType).toBe('touch');
    expect(fallbackDown.eventTime).toBe(5);

    const rawCoalesced = pointerEvent('pointermove', {
      pointerId: 5,
      clientX: 16,
      clientY: 26,
      pointerType: '',
      timeStamp: 9,
    });
    const rawMove = pointerEvent('pointermove', {
      pointerId: 5,
      clientX: 20,
      clientY: 30,
      pointerType: '',
      timeStamp: 13,
    });
    Object.defineProperty(rawMove, 'getCoalescedEvents', {
      value: () => [rawCoalesced, rawMove],
    });
    const fallbackMove = stream.onPointerMove(rawMove)!;
    expect(fallbackMove.pointerType).toBe('touch');
    expect(fallbackMove.history[0]).toEqual({eventTime: 9, x: 16, y: 26});

    const rawUp = pointerEvent('pointerup', {
      pointerId: 5,
      clientX: 20,
      clientY: 30,
      pointerType: '',
      timeStamp: 17,
    });
    const fallbackUp = stream.onPointerUp(rawUp)!;
    expect(fallbackUp.getActivePointers()).toEqual([]);

    stream.onPointerDown(rawEv);
    const rawCancel = pointerEvent('pointercancel', {
      pointerId: 5,
      clientX: 15,
      clientY: 25,
      pointerType: '',
      timeStamp: 21,
    });
    expect(stream.onPointerCancel(rawCancel)!.pointerType).toBe('touch');

    const emptySnapshot = new MotionEvent({
      action: MotionAction.DOWN,
      eventTime: 0,
      actionIndex: 0,
      pointerType: 'touch',
      pointers: [],
      originalEvent: rawEv,
    });
    expect(emptySnapshot.focus).toEqual({x: 0, y: 0});
    expect(emptySnapshot.actionPointerId).toBe(-1);

    const degeneratePointerUp = new MotionEvent({
      action: MotionAction.POINTER_UP,
      eventTime: 10,
      actionIndex: 0,
      pointerType: 'touch',
      pointers: [{pointerId: 1, x: 42, y: 84}],
      originalEvent: rawEv,
    });
    expect(degeneratePointerUp.focus).toEqual({x: 42, y: 84});
  });

  it('recovers from orphaned ghost pointers and modality switches', () => {
    stream.onPointerDown(
      pointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        clientX: 10,
        clientY: 10,
        timeStamp: 10,
      })
    );
    stream.onPointerDown(
      pointerEvent('pointerdown', {
        pointerId: 2,
        pointerType: 'touch',
        isPrimary: false,
        clientX: 40,
        clientY: 10,
        timeStamp: 15,
      })
    );
    stream.onPointerUp(
      pointerEvent('pointerup', {
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        clientX: 10,
        clientY: 10,
        timeStamp: 25,
      })
    );
    // Secondary pointerId 2 was never released; next primary touch starts a clean stream.
    const recoveredDown = stream.onPointerDown(
      pointerEvent('pointerdown', {
        pointerId: 3,
        pointerType: 'touch',
        isPrimary: true,
        clientX: 50,
        clientY: 60,
        timeStamp: 500,
      })
    )!;
    expect(recoveredDown.action).toBe(MotionAction.DOWN);
    expect(recoveredDown.pointers.length).toBe(1);
    expect(recoveredDown.eventTime).toBe(500);

    const penDown = stream.onPointerDown(
      pointerEvent('pointerdown', {
        pointerId: 9,
        pointerType: 'pen',
        clientX: 60,
        clientY: 70,
        timeStamp: 550,
      })
    )!;
    expect(penDown.action).toBe(MotionAction.DOWN);
    expect(penDown.eventTime).toBe(550);

    const dupDown = stream.onPointerDown(
      pointerEvent('pointerdown', {
        pointerId: 9,
        pointerType: 'mouse',
        clientX: 70,
        clientY: 80,
        timeStamp: 600,
      })
    )!;
    expect(dupDown.action).toBe(MotionAction.DOWN);
    expect(dupDown.eventTime).toBe(600);
  });

  it('filters bogus coalesced samples, skips history when disabled, and supports silent updates and cancelAll', () => {
    stream.onPointerDown(
      pointerEvent('pointerdown', {
        pointerId: 9,
        pointerType: 'mouse',
        clientX: 70,
        clientY: 80,
        timeStamp: 600,
      })
    );

    const bogusZero = pointerEvent('pointermove', {
      pointerId: 9,
      clientX: 76,
      clientY: 86,
      timeStamp: 0,
    });
    const bogusFuture = pointerEvent('pointermove', {
      pointerId: 9,
      clientX: 77,
      clientY: 87,
      timeStamp: 999,
    });
    const terminal = pointerEvent('pointermove', {
      pointerId: 9,
      clientX: 80,
      clientY: 90,
      timeStamp: 620,
    });
    const webkitMove = stream.onPointerMove(
      pointerEvent('pointermove', {
        pointerId: 9,
        clientX: 80,
        clientY: 90,
        timeStamp: 620,
        coalescedEvents: [bogusZero, bogusFuture, terminal],
      })
    )!;
    expect(webkitMove.history).toHaveLength(0);

    const blurEv = new Event('blur');
    Object.defineProperty(blurEv, 'timeStamp', {value: 700});
    const cancelled = stream.cancelAll(blurEv)!;
    expect(cancelled.action).toBe(MotionAction.CANCEL);
    expect(cancelled.eventTime).toBe(700);
    expect(cancelled.focus).toEqual({x: 80, y: 90});
    expect(stream.cancelAll(blurEv)).toBeNull();

    stream.onPointerDown(pointerEvent('pointerdown', {pointerId: 3, isPrimary: true}));
    const zeroBlur = new Event('blur');
    Object.defineProperty(zeroBlur, 'timeStamp', {value: 0});
    expect(stream.cancelAll(zeroBlur)!.action).toBe(MotionAction.CANCEL);

    // Orphaned stylus (`pen`) pointer recovers cleanly on next pen press:
    stream.onPointerDown(pointerEvent('pointerdown', {pointerType: 'pen', pointerId: 11}));
    const freshPen = stream.onPointerDown(
      pointerEvent('pointerdown', {pointerType: 'pen', pointerId: 12})
    )!;
    expect(freshPen.action).toBe(MotionAction.DOWN);
    expect(freshPen.pointers.length).toBe(1);
  });
});
