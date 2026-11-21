import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {GestureManager} from '../src/gesture_manager';
import {GestureRecognizer} from '../src/gesture_recognizer';
import type {MotionEvent} from '../src/motion_event';
import {LongPressRecognizer} from '../src/recognizers/long_press_recognizer';
import {PanRecognizer} from '../src/recognizers/pan_recognizer';
import {QuickScaleRecognizer} from '../src/recognizers/quick_scale_recognizer';
import {RotateRecognizer} from '../src/recognizers/rotate_recognizer';
import {ScaleRecognizer} from '../src/recognizers/scale_recognizer';
import {TapRecognizer} from '../src/recognizers/tap_recognizer';
import {pointerEvent} from './test_helpers';

class SpyRecognizer extends GestureRecognizer {
  readonly events: MotionEvent[] = [];
  cancelled = false;

  /** @internal */
  override get acceptsMultiTouch(): boolean {
    return true;
  }

  onMotionEvent(event: MotionEvent): void {
    this.events.push(event);
    if (event.action === 'down') {
      this.tryBegin(() => {});
    }
  }

  protected override onCancel(): void {
    this.cancelled = true;
  }
}

describe('GestureManager', () => {
  let element: HTMLElement;
  let manager: GestureManager;
  let recognizer: SpyRecognizer;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
    recognizer = new SpyRecognizer();
    manager = new GestureManager(element, {
      supportedPointerTypes: ['touch', 'mouse'],
      recognizers: [recognizer],
    });
  });

  afterEach(() => {
    manager.destroy();
    element.remove();
  });

  it('dispatches normalized MotionEvents for supported pointer types and attaches zero idle pointermove listeners', () => {
    element.dispatchEvent(pointerEvent('pointermove', {pointerType: 'mouse', pointerId: 1}));
    expect(recognizer.events).toHaveLength(0);

    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 1}));
    expect(recognizer.events).toHaveLength(1);
    expect(recognizer.events[0].action).toBe('down');
  });

  it('ignores unsupported pointer types', () => {
    const spy = new SpyRecognizer();
    const touchOnly = new GestureManager(element, {
      supportedPointerTypes: ['touch'],
      recognizers: [spy],
    });

    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'mouse', pointerId: 1}));
    element.dispatchEvent(pointerEvent('pointerup', {pointerType: 'mouse', pointerId: 1}));
    element.dispatchEvent(pointerEvent('pointercancel', {pointerType: 'mouse', pointerId: 1}));
    expect(spy.events).toHaveLength(0);
    touchOnly.destroy();
  });

  it('acquires setPointerCapture lazily once a continuous gesture begins, preserving child clicks on taps', () => {
    const container = document.createElement('div');
    const childButton = document.createElement('button');
    container.appendChild(childButton);
    document.body.appendChild(container);

    const captureSpy = vi.fn();
    container.setPointerCapture = captureSpy;
    container.hasPointerCapture = () => true;
    container.releasePointerCapture = vi.fn();

    const onTap = vi.fn();
    const onPanStart = vi.fn();
    const gm = new GestureManager(container, {
      supportedPointerTypes: ['touch', 'mouse'],
      recognizers: [new TapRecognizer({onTap}), new PanRecognizer({onPanStart}, {slop: 8})],
    });

    childButton.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 20, clientY: 20, timeStamp: 0})
    );
    expect(captureSpy).not.toHaveBeenCalled();

    childButton.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 1, clientX: 20, clientY: 20, timeStamp: 40})
    );
    expect(captureSpy).not.toHaveBeenCalled();
    expect(onTap).toHaveBeenCalledTimes(1);

    childButton.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 2, clientX: 20, clientY: 20, timeStamp: 100})
    );
    expect(captureSpy).not.toHaveBeenCalled();

    childButton.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 24, clientY: 20, timeStamp: 110})
    );
    expect(captureSpy).not.toHaveBeenCalled();

    childButton.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 40, clientY: 20, timeStamp: 120})
    );
    expect(onPanStart).toHaveBeenCalledTimes(1);
    expect(captureSpy).toHaveBeenCalledWith(2);

    gm.destroy();
    container.remove();
  });

  it('detects multi-touch gestures when fingers start on different child elements and ignores bubbling child lostpointercapture', () => {
    const container = document.createElement('div');
    const childSpan = document.createElement('span');
    const childButton = document.createElement('button');
    container.append(childSpan, childButton);
    document.body.appendChild(container);

    // Simulate W3C implicit touch capture releasing on the child when container captures the pointer.
    const implicitChildOwner = new Map<number, HTMLElement>([
      [1, childSpan],
      [2, childButton],
    ]);
    container.setPointerCapture = (pointerId: number) => {
      const prevOwner = implicitChildOwner.get(pointerId);
      if (prevOwner) {
        implicitChildOwner.delete(pointerId);
        prevOwner.dispatchEvent(pointerEvent('lostpointercapture', {pointerId}));
      }
    };
    container.hasPointerCapture = () => true;
    container.releasePointerCapture = vi.fn();

    const onScaleStart = vi.fn();
    const onScale = vi.fn();
    const onScaleCancel = vi.fn();
    const onRotate = vi.fn();

    const rotate = new RotateRecognizer({onRotate}, {rotationSlop: 2, minSpan: 20});
    const gm = new GestureManager(container, {
      recognizers: [
        new ScaleRecognizer(
          {onScaleStart, onScale, onScaleCancel},
          {spanSlop: 8, minSpan: 20}
        ).simultaneousWith(rotate),
        rotate,
      ],
    });

    childSpan.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerId: 1,
        isPrimary: true,
        clientX: 0,
        clientY: 0,
        timeStamp: 0,
      })
    );
    childButton.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerId: 2,
        isPrimary: false,
        clientX: 100,
        clientY: 0,
        timeStamp: 5,
      })
    );

    childButton.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 150, clientY: 50, timeStamp: 20})
    );
    container.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 200, clientY: 100, timeStamp: 35})
    );

    expect(onScaleStart).toHaveBeenCalledTimes(1);
    expect(onScale).toHaveBeenCalledTimes(2);
    expect(onScaleCancel).not.toHaveBeenCalled();
    expect(onRotate).toHaveBeenCalled();

    gm.destroy();
    container.remove();
  });

  it('tracks secondary fingers landing outside target for multi-touch surfaces without interfering with separate 1-finger controls', () => {
    (window as unknown as Record<string, unknown>).GestureEvent = class MockGestureEvent extends (
      Event
    ) {};
    try {
      const photo = document.createElement('div');
      const outside = document.createElement('div');
      const sliderA = document.createElement('div');
      const sliderB = document.createElement('div');
      document.body.append(photo, outside, sliderA, sliderB);

      const onScale = vi.fn();
      const onScaleCancel = vi.fn();
      const gmPhoto = new GestureManager(photo, {
        recognizers: [new ScaleRecognizer({onScale, onScaleCancel}, {spanSlop: 8, minSpan: 20})],
      });

      photo.dispatchEvent(
        pointerEvent('pointerdown', {
          pointerId: 1,
          isPrimary: true,
          clientX: 50,
          clientY: 50,
          timeStamp: 0,
        })
      );
      outside.dispatchEvent(
        pointerEvent('pointerdown', {
          pointerId: 2,
          isPrimary: false,
          clientX: 150,
          clientY: 50,
          timeStamp: 10,
        })
      );

      const straddleTouchMove = new Event('touchmove', {bubbles: true, cancelable: true});
      Object.defineProperty(straddleTouchMove, 'touches', {
        value: [{identifier: 1}, {identifier: 2}],
      });
      outside.dispatchEvent(straddleTouchMove);
      expect(straddleTouchMove.defaultPrevented).toBe(true);

      const straddleSafariGesture = new Event('gesturestart', {bubbles: true, cancelable: true});
      outside.dispatchEvent(straddleSafariGesture);
      expect(straddleSafariGesture.defaultPrevented).toBe(true);

      outside.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 2, clientX: 250, clientY: 50, timeStamp: 25})
      );
      expect(onScale).toHaveBeenCalledTimes(1);

      outside.dispatchEvent(
        pointerEvent('pointerdown', {
          pointerId: 3,
          isPrimary: true,
          clientX: 300,
          clientY: 300,
          timeStamp: 500,
        })
      );
      expect(onScaleCancel).toHaveBeenCalledTimes(1);

      const onSliderA = vi.fn();
      const onSliderB = vi.fn();
      const gmA = new GestureManager(sliderA, {
        recognizers: [new PanRecognizer({onPan: onSliderA}, {numPointers: 1, slop: 4})],
      });
      const gmB = new GestureManager(sliderB, {
        recognizers: [new PanRecognizer({onPan: onSliderB}, {numPointers: 1, slop: 4})],
      });

      sliderA.dispatchEvent(
        pointerEvent('pointerdown', {
          pointerId: 10,
          isPrimary: true,
          clientX: 0,
          clientY: 0,
          timeStamp: 600,
        })
      );
      sliderB.dispatchEvent(
        pointerEvent('pointerdown', {
          pointerId: 11,
          isPrimary: false,
          clientX: 200,
          clientY: 0,
          timeStamp: 605,
        })
      );
      sliderA.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 10, clientX: 30, clientY: 0, timeStamp: 620})
      );
      sliderB.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 11, clientX: 230, clientY: 0, timeStamp: 620})
      );
      expect(onSliderA).toHaveBeenCalledTimes(1);
      expect(onSliderB).toHaveBeenCalledTimes(1);

      gmA.destroy();
      gmB.destroy();
      gmPhoto.destroy();
      photo.remove();
      outside.remove();
      sliderA.remove();
      sliderB.remove();
    } finally {
      delete (window as unknown as Record<string, unknown>).GestureEvent;
    }
  });

  it('recovers from swallowed off-page mouse pointerup (buttons === 0), mid-drag desktop contextmenu, and ignores macOS Ctrl+Click', () => {
    const box = document.createElement('div');
    document.body.appendChild(box);
    const onPanStart = vi.fn();
    const onPanCancel = vi.fn();
    const gm = new GestureManager(box, {
      recognizers: [new PanRecognizer({onPanStart, onPanCancel}, {slop: 4})],
    });

    box.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerType: 'mouse',
        pointerId: 1,
        button: 0,
        buttons: 1,
        ctrlKey: true,
        clientX: 10,
        clientY: 10,
        timeStamp: 0,
      })
    );
    const ctrlContextMenu = pointerEvent('contextmenu', {pointerType: 'mouse', button: 0});
    box.dispatchEvent(ctrlContextMenu);
    expect(ctrlContextMenu.defaultPrevented).toBe(false);
    expect(onPanStart).not.toHaveBeenCalled();

    box.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerType: 'mouse',
        pointerId: 1,
        button: 0,
        buttons: 1,
        clientX: 10,
        clientY: 10,
        timeStamp: 20,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {
        pointerType: 'mouse',
        pointerId: 1,
        buttons: 1,
        clientX: 40,
        clientY: 10,
        timeStamp: 36,
      })
    );
    expect(onPanStart).toHaveBeenCalledTimes(1);

    document.dispatchEvent(
      pointerEvent('pointermove', {
        pointerType: 'mouse',
        pointerId: 1,
        buttons: 0,
        clientX: 60,
        clientY: 10,
        timeStamp: 100,
      })
    );
    expect(onPanCancel).toHaveBeenCalledTimes(1);

    onPanCancel.mockClear();
    box.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerType: 'mouse',
        pointerId: 1,
        button: 0,
        buttons: 1,
        clientX: 10,
        clientY: 10,
        timeStamp: 200,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {
        pointerType: 'mouse',
        pointerId: 1,
        buttons: 1,
        clientX: 40,
        clientY: 10,
        timeStamp: 216,
      })
    );
    const midDragMenu = pointerEvent('contextmenu', {pointerType: 'mouse', button: 2});
    box.dispatchEvent(midDragMenu);
    expect(midDragMenu.defaultPrevented).toBe(false);
    expect(onPanCancel).toHaveBeenCalledTimes(1);

    gm.destroy();
    box.remove();
  });

  it('cancels active gestures cleanly on lostpointercapture for captured pointers and ignores stale/uncaptured ones', () => {
    element.setPointerCapture = vi.fn();
    element.hasPointerCapture = () => true;
    element.releasePointerCapture = vi.fn();

    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 1}));
    expect(recognizer.active).toBe(true);

    // Uncaptured pointerId does not cancel the active stream:
    element.dispatchEvent(
      pointerEvent('lostpointercapture', {pointerType: 'touch', pointerId: 99})
    );
    expect(recognizer.cancelled).toBe(false);
    expect(recognizer.active).toBe(true);

    // Captured pointerId cancels cleanly:
    element.dispatchEvent(pointerEvent('lostpointercapture', {pointerType: 'touch', pointerId: 1}));
    expect(recognizer.cancelled).toBe(true);
    expect(recognizer.active).toBe(false);
  });

  it('cleans up listeners on destroy', () => {
    manager.destroy();
    manager.destroy();
    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 1}));
    expect(recognizer.events).toHaveLength(0);
  });

  it('covers cancel, document pointerup/cancel, and touchAction: false', () => {
    const unstyledEl = document.createElement('div');
    document.body.appendChild(unstyledEl);
    const spy = new SpyRecognizer();
    const customManager = new GestureManager(unstyledEl, {
      supportedPointerTypes: ['touch', 'mouse'],
      touchAction: false,
      recognizers: [spy],
    });
    expect(unstyledEl.style.touchAction || '').toBe('');

    unstyledEl.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 1}));
    unstyledEl.dispatchEvent(pointerEvent('pointermove', {pointerType: 'touch', pointerId: 1}));
    unstyledEl.dispatchEvent(pointerEvent('pointerup', {pointerType: 'touch', pointerId: 1}));
    expect(spy.events).toHaveLength(3);
    customManager.cancel();
    customManager.destroy();
    unstyledEl.remove();

    const captureSetSpy = vi.fn();
    const captureReleaseSpy = vi.fn();
    element.setPointerCapture = captureSetSpy;
    element.hasPointerCapture = () => true;
    element.releasePointerCapture = captureReleaseSpy;

    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 10}));
    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 11}));
    expect(captureSetSpy).toHaveBeenCalledWith(10);
    expect(captureSetSpy).toHaveBeenCalledWith(11);

    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerType: 'mouse', pointerId: 12, button: 2})
    );

    document.dispatchEvent(pointerEvent('pointerup', {pointerType: 'touch', pointerId: 10}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerType: 'touch', pointerId: 11}));
    expect(captureReleaseSpy).toHaveBeenCalledWith(10);
    expect(captureReleaseSpy).toHaveBeenCalledWith(11);

    element.dispatchEvent(
      pointerEvent('lostpointercapture', {pointerType: 'touch', pointerId: 10})
    );

    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 20}));
    document.dispatchEvent(pointerEvent('pointercancel', {pointerType: 'touch', pointerId: 20}));
    expect(recognizer.cancelled).toBe(true);

    recognizer.cancelled = false;
    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 21}));
    element.dispatchEvent(pointerEvent('pointercancel', {pointerType: 'touch', pointerId: 21}));
    expect(recognizer.cancelled).toBe(true);
  });

  it('computes least-restrictive CSS touch-action without scroll-locking mobile pages', () => {
    const card = document.createElement('div');
    document.body.appendChild(card);

    const emptyGm = new GestureManager(card);
    expect(card.style.touchAction || '').toBe('');
    emptyGm.destroy();

    const addListenerSpy = vi.spyOn(card, 'addEventListener');
    const mouseTapSpy = vi.fn();
    const tap = new TapRecognizer({onTap: mouseTapSpy});
    const tapGm = new GestureManager(card, {recognizers: [tap]});
    expect(tapGm.computeTouchAction()).toBe('manipulation');
    expect(card.style.touchAction).toBe('manipulation');
    expect(card.style.userSelect || '').toBe('');
    expect(addListenerSpy.mock.calls.some(([type]) => type === 'touchmove')).toBe(false);

    card.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerType: 'mouse',
        pointerId: 1,
        clientX: 5,
        clientY: 5,
        timeStamp: 0,
      })
    );
    card.dispatchEvent(
      pointerEvent('pointerup', {
        pointerType: 'mouse',
        pointerId: 1,
        clientX: 5,
        clientY: 5,
        timeStamp: 20,
      })
    );
    expect(mouseTapSpy).toHaveBeenCalledTimes(1);
    tapGm.destroy();
    expect(card.style.touchAction || '').toBe('');

    const horizPan = new PanRecognizer({}, {direction: 'horizontal'});
    const panGm = new GestureManager(card, {recognizers: [tap, horizPan]});
    expect(card.style.touchAction).toBe('pan-y pinch-zoom');
    expect(card.style.userSelect).toBe('none');
    expect((card.style as unknown as Record<string, string>).webkitTouchCallout).toBe('none');
    panGm.destroy();

    const scale = new ScaleRecognizer({});
    const panScaleGm = new GestureManager(card, {recognizers: [tap, horizPan, scale]});
    expect(card.style.touchAction).toBe('pan-y');
    panScaleGm.destroy();

    const scaleGm = new GestureManager(card, {recognizers: [tap, scale]});
    expect(card.style.touchAction).toBe('pan-x pan-y');
    scaleGm.destroy();
    expect(card.style.touchAction).toBe('');
    expect(card.style.userSelect || '').toBe('');

    expect(new PanRecognizer({}, {direction: 'vertical'}).getTouchAction()).toBe(
      'pan-x pinch-zoom'
    );
    expect(new PanRecognizer({}, {direction: 'horizontal'}).getTouchAction()).toBe(
      'pan-y pinch-zoom'
    );
    expect(new PanRecognizer({}, {direction: 'both'}).getTouchAction()).toBe('none');
    expect(new QuickScaleRecognizer({}).getTouchAction()).toBe('manipulation');
    expect(new LongPressRecognizer({onLongPress: () => {}}).getTouchAction()).toBe('manipulation');
    expect(new RotateRecognizer({}).getTouchAction()).toBe('pan-x pan-y');

    const explicitActionEl = document.createElement('div');
    const gmExplicitAction = new GestureManager(explicitActionEl, {touchAction: 'pan-x'});
    expect(explicitActionEl.style.touchAction).toBe('pan-x');
    gmExplicitAction.destroy();

    card.remove();
  });

  it('coexists cleanly with iOS Safari scrolling for directional Pan and Swipe', () => {
    const dispatchTouchMove = (
      target: HTMLElement,
      touchCount: number,
      cancelable = true
    ): {event: Event; prevented: boolean} => {
      const ev = new Event('touchmove', {bubbles: true, cancelable});
      Object.defineProperty(ev, 'touches', {
        value: Array.from({length: touchCount}, (_, i) => ({identifier: i + 1})),
      });
      target.dispatchEvent(ev);
      return {event: ev, prevented: ev.defaultPrevented};
    };

    const carousel = document.createElement('div');
    document.body.appendChild(carousel);
    const onPan = vi.fn();
    const gmCarousel = new GestureManager(carousel, {
      recognizers: [new PanRecognizer({onPan}, {direction: 'horizontal', slop: 8})],
    });

    carousel.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 0})
    );
    carousel.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 1, clientX: 52, clientY: 75, timeStamp: 16})
    );
    expect(dispatchTouchMove(carousel, 1).prevented).toBe(false);
    expect(dispatchTouchMove(carousel, 2).prevented).toBe(false);
    carousel.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 1, clientX: 52, clientY: 75, timeStamp: 32})
    );

    carousel.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 2, clientX: 50, clientY: 50, timeStamp: 100})
    );
    carousel.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 70, clientY: 52, timeStamp: 116})
    );
    expect(onPan).toHaveBeenCalled();
    expect(dispatchTouchMove(carousel, 1, true).prevented).toBe(true);
    expect(dispatchTouchMove(carousel, 1, false).prevented).toBe(false);
    carousel.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 2, clientX: 70, clientY: 52, timeStamp: 132})
    );
    gmCarousel.destroy();
    carousel.remove();

    const swipeCard = document.createElement('div');
    document.body.appendChild(swipeCard);
    const onSwipe = vi.fn();
    const gmSwipe = new GestureManager(swipeCard, {
      recognizers: [new PanRecognizer({onSwipe}, {direction: 'horizontal'})],
    });

    swipeCard.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 100, clientY: 100, timeStamp: 0})
    );
    swipeCard.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 1, clientX: 101, clientY: 120, timeStamp: 16})
    );
    expect(dispatchTouchMove(swipeCard, 1).prevented).toBe(false);
    swipeCard.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 1, clientX: 101, clientY: 120, timeStamp: 32})
    );

    swipeCard.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 2, clientX: 100, clientY: 100, timeStamp: 50})
    );
    swipeCard.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 70, clientY: 102, timeStamp: 65})
    );
    expect(dispatchTouchMove(swipeCard, 1).prevented).toBe(true);
    swipeCard.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 20, clientY: 105, timeStamp: 78})
    );
    swipeCard.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 2, clientX: 20, clientY: 105, timeStamp: 80})
    );
    expect(onSwipe).toHaveBeenCalledTimes(1);

    gmSwipe.destroy();
    const gmVertSwipe = new GestureManager(swipeCard, {
      recognizers: [new PanRecognizer({}, {direction: 'vertical'})],
    });
    swipeCard.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 3, clientX: 100, clientY: 100, timeStamp: 100})
    );
    swipeCard.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 3, clientX: 102, clientY: 75, timeStamp: 115})
    );
    expect(dispatchTouchMove(swipeCard, 1).prevented).toBe(true);
    swipeCard.dispatchEvent(
      pointerEvent('pointercancel', {pointerId: 3, clientX: 102, clientY: 75, timeStamp: 120})
    );
    gmVertSwipe.destroy();
    swipeCard.remove();
  });

  it('prevents Safari GestureEvent zoom, QuickScale touchmove, and touch/pen contextmenu while keeping mouse right-click', () => {
    const dispatchTouchMove = (
      target: HTMLElement,
      touchCount: number,
      cancelable = true
    ): {event: Event; prevented: boolean} => {
      const ev = new Event('touchmove', {bubbles: true, cancelable});
      Object.defineProperty(ev, 'touches', {
        value: Array.from({length: touchCount}, (_, i) => ({identifier: i + 1})),
      });
      target.dispatchEvent(ev);
      return {event: ev, prevented: ev.defaultPrevented};
    };

    (window as unknown as Record<string, unknown>).GestureEvent = class MockGestureEvent extends (
      Event
    ) {};
    try {
      const photo = document.createElement('div');
      document.body.appendChild(photo);
      const gmPhoto = new GestureManager(photo, {
        recognizers: [new ScaleRecognizer({}), new QuickScaleRecognizer({})],
      });
      expect(photo.style.touchAction).toBe('pan-x pan-y');

      photo.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 0})
      );
      photo.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 1, clientX: 50, clientY: 80, timeStamp: 16})
      );
      expect(dispatchTouchMove(photo, 1).prevented).toBe(false);
      photo.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 80, timeStamp: 32})
      );

      expect(dispatchTouchMove(photo, 2).prevented).toBe(true);

      const gsCancelable = new Event('gesturestart', {cancelable: true});
      photo.dispatchEvent(gsCancelable);
      expect(gsCancelable.defaultPrevented).toBe(true);

      const gcNonCancelable = new Event('gesturechange', {cancelable: false});
      photo.dispatchEvent(gcNonCancelable);
      expect(gcNonCancelable.defaultPrevented).toBe(false);

      photo.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 60, clientY: 60, timeStamp: 500})
      );
      photo.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 2, clientX: 60, clientY: 60, timeStamp: 530})
      );
      photo.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 62, clientY: 62, timeStamp: 620})
      );
      expect(dispatchTouchMove(photo, 1).prevented).toBe(true);
      photo.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 3, clientX: 62, clientY: 62, timeStamp: 650})
      );

      const desktopRightClick = pointerEvent('contextmenu', {pointerType: 'mouse', button: 2});
      photo.dispatchEvent(desktopRightClick);
      expect(desktopRightClick.defaultPrevented).toBe(false);

      const touchContextMenu = pointerEvent('contextmenu', {pointerType: 'touch'});
      photo.dispatchEvent(touchContextMenu);
      expect(touchContextMenu.defaultPrevented).toBe(true);

      const penContextMenu = pointerEvent('contextmenu', {pointerType: 'pen'});
      photo.dispatchEvent(penContextMenu);
      expect(penContextMenu.defaultPrevented).toBe(true);

      gmPhoto.destroy();
      photo.remove();
    } finally {
      delete (window as unknown as Record<string, unknown>).GestureEvent;
    }
  });

  it('aborts stuck pointers on window blur and hidden visibilitychange, and suppresses ancestor ghost clicks without eating fast clicks elsewhere', () => {
    vi.useFakeTimers();
    try {
      const outerLink = document.createElement('a');
      outerLink.href = '#target';
      const innerCard = document.createElement('div');
      outerLink.appendChild(innerCard);
      const otherBtn = document.createElement('button');
      document.body.append(outerLink, otherBtn);

      const onPanCancel = vi.fn();
      const onPanEnd = vi.fn();
      const linkClickSpy = vi.fn((e: MouseEvent) => e.preventDefault());
      const otherClickSpy = vi.fn();
      outerLink.addEventListener('click', linkClickSpy);
      otherBtn.addEventListener('click', otherClickSpy);

      const tap = new TapRecognizer({});
      const pan = new PanRecognizer({onPanCancel, onPanEnd}, {slop: 5});
      const gm = new GestureManager(innerCard, {recognizers: [tap, pan]});

      innerCard.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 10})
      );
      innerCard.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 1, clientX: 30, clientY: 10, timeStamp: 20})
      );
      window.dispatchEvent(new Event('blur'));
      expect(onPanCancel).toHaveBeenCalledTimes(1);

      onPanCancel.mockClear();
      innerCard.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 10, clientY: 10, timeStamp: 30})
      );
      innerCard.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 2, clientX: 30, clientY: 10, timeStamp: 40})
      );
      Object.defineProperty(document, 'visibilityState', {value: 'visible', configurable: true});
      document.dispatchEvent(new Event('visibilitychange'));
      expect(onPanCancel).not.toHaveBeenCalled();

      Object.defineProperty(document, 'visibilityState', {value: 'hidden', configurable: true});
      document.dispatchEvent(new Event('visibilitychange'));
      expect(onPanCancel).toHaveBeenCalledTimes(1);
      Object.defineProperty(document, 'visibilityState', {value: 'visible', configurable: true});

      innerCard.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 10, clientY: 10, timeStamp: 100})
      );
      innerCard.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 3, clientX: 40, clientY: 10, timeStamp: 116})
      );
      innerCard.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 3, clientX: 40, clientY: 10, timeStamp: 132})
      );
      expect(onPanEnd).toHaveBeenCalledTimes(1);

      const kbClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 0});
      outerLink.dispatchEvent(kbClick);
      expect(linkClickSpy).toHaveBeenCalledTimes(1);

      otherBtn.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1}));
      expect(otherClickSpy).toHaveBeenCalledTimes(1);
      otherClickSpy.mockClear();

      const ghostClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
      outerLink.dispatchEvent(ghostClick);
      expect(ghostClick.defaultPrevented).toBe(true);
      expect(linkClickSpy).toHaveBeenCalledTimes(1);

      innerCard.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 4, clientX: 10, clientY: 10, timeStamp: 150})
      );
      innerCard.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 4, clientX: 40, clientY: 10, timeStamp: 166})
      );
      innerCard.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 4, clientX: 40, clientY: 10, timeStamp: 180})
      );
      otherBtn.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 5, clientX: 200, clientY: 200, timeStamp: 210})
      );
      otherBtn.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 5, clientX: 200, clientY: 200, timeStamp: 225})
      );
      otherBtn.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1}));
      expect(otherClickSpy).toHaveBeenCalledTimes(1);

      innerCard.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 6, clientX: 10, clientY: 10, timeStamp: 250})
      );
      innerCard.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 6, clientX: 40, clientY: 10, timeStamp: 266})
      );
      innerCard.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 6, clientX: 40, clientY: 10, timeStamp: 280})
      );
      vi.advanceTimersByTime(500);
      const laterClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
      outerLink.dispatchEvent(laterClick);
      expect(linkClickSpy).toHaveBeenCalledTimes(2);

      gm.destroy();
      outerLink.remove();
      otherBtn.remove();
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores foreign pointer types, unknown pointer ids, and normalizes empty pointerType mid-stream', () => {
    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: '', pointerId: 1}));
    expect(recognizer.events).toHaveLength(1);
    expect(recognizer.events[0].pointerType).toBe('touch');

    document.dispatchEvent(pointerEvent('pointermove', {pointerType: 'pen', pointerId: 9}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerType: 'pen', pointerId: 9}));
    document.dispatchEvent(pointerEvent('pointercancel', {pointerType: 'pen', pointerId: 9}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerType: 'touch', pointerId: 42}));
    document.dispatchEvent(pointerEvent('pointercancel', {pointerType: 'touch', pointerId: 42}));
    expect(recognizer.events).toHaveLength(1);
    expect(recognizer.cancelled).toBe(false);

    document.dispatchEvent(pointerEvent('pointerup', {pointerType: 'touch', pointerId: 1}));
    expect(recognizer.events.at(-1)?.action).toBe('up');
  });

  it('suppresses ghost clicks inside a shadow-DOM surface and on a light-DOM ancestor', () => {
    vi.useFakeTimers();
    try {
      const outer = document.createElement('a');
      const host = document.createElement('div');
      outer.appendChild(host);
      document.body.appendChild(outer);
      const surface = document.createElement('div');
      host.attachShadow({mode: 'open'}).appendChild(surface);

      const gm = new GestureManager(surface, {
        recognizers: [new PanRecognizer({}, {slop: 4})],
      });
      surface.dispatchEvent(pointerEvent('pointerdown', {pointerId: 3, clientX: 0, clientY: 0}));
      surface.dispatchEvent(pointerEvent('pointermove', {pointerId: 3, clientX: 30, clientY: 0}));
      surface.dispatchEvent(pointerEvent('pointerup', {pointerId: 3, clientX: 30, clientY: 0}));

      const shadowGhost = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: 1,
      });
      surface.dispatchEvent(shadowGhost);
      expect(shadowGhost.defaultPrevented).toBe(true);
      gm.destroy();

      const gmHost = new GestureManager(host, {
        recognizers: [new PanRecognizer({}, {slop: 4})],
      });
      host.dispatchEvent(pointerEvent('pointerdown', {pointerId: 4, clientX: 0, clientY: 0}));
      host.dispatchEvent(pointerEvent('pointermove', {pointerId: 4, clientX: 30, clientY: 0}));
      host.dispatchEvent(pointerEvent('pointerup', {pointerId: 4, clientX: 30, clientY: 0}));

      const unrelated = document.createElement('button');
      document.body.appendChild(unrelated);
      const unrelatedClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
      unrelated.dispatchEvent(unrelatedClick);
      expect(unrelatedClick.defaultPrevented).toBe(false);
      unrelated.remove();

      const ancestorGhost = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
      outer.dispatchEvent(ancestorGhost);
      expect(ancestorGhost.defaultPrevented).toBe(true);

      gmHost.destroy();
      outer.remove();
    } finally {
      vi.useRealTimers();
    }
  });

  it('releases orphaned pointer captures when a fresh primary DOWN recovers the stream', () => {
    const released: number[] = [];
    element.setPointerCapture = vi.fn();
    element.hasPointerCapture = () => true;
    element.releasePointerCapture = (id: number) => {
      released.push(id);
    };

    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, pointerType: 'touch', isPrimary: true})
    );
    expect(recognizer.active).toBe(true);

    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 2, pointerType: 'touch', isPrimary: true})
    );
    expect(released).toEqual([1]);
  });

  it('supports SVGElement targets, explicit touchAction: none, orphaned pen recovery, and mouse-only surfaces', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(svg);

    const addSpy = vi.spyOn(svg, 'addEventListener');
    const onPan = vi.fn();
    const onPanCancel = vi.fn();

    const pan = new PanRecognizer({onPan, onPanCancel}, {direction: 'horizontal', slop: 6});
    const gm = new GestureManager(svg, {
      recognizers: [pan, pan],
    });
    expect(gm.element).toBe(svg);
    expect(svg.style.touchAction).toBe('pan-y pinch-zoom');
    expect(addSpy.mock.calls.filter(([type]) => type === 'touchmove')).toHaveLength(1);
    gm.destroy();

    // Explicit `touchAction: 'none'` skips attaching a redundant element `touchmove` guard:
    addSpy.mockClear();
    const gmLocked = new GestureManager(svg, {
      touchAction: 'none',
      supportedPointerTypes: ['touch', 'pen'],
      recognizers: [pan],
    });
    expect(svg.style.touchAction).toBe('none');
    expect(addSpy.mock.calls.filter(([type]) => type === 'touchmove')).toHaveLength(0);

    // Orphaned stylus (`pen`) drag aborts cleanly if a new pen press starts outside the target:
    svg.dispatchEvent(
      pointerEvent('pointerdown', {pointerType: 'pen', pointerId: 9, clientX: 0, clientY: 0})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerType: 'pen', pointerId: 9, clientX: 20, clientY: 0})
    );
    document.body.dispatchEvent(
      pointerEvent('pointerdown', {pointerType: 'pen', pointerId: 10, clientX: 300, clientY: 300})
    );
    expect(onPanCancel).toHaveBeenCalledTimes(1);

    gmLocked.destroy();
    expect(svg.style.touchAction || '').toBe('');
    svg.remove();

    // Mouse-only surface keeps native mobile touch scrolling unlocked while preventing text selection:
    const mouseEl = document.createElement('div');
    document.body.appendChild(mouseEl);
    const mouseOnly = new GestureManager(mouseEl, {
      supportedPointerTypes: ['mouse'],
      recognizers: [new PanRecognizer({})],
    });
    expect(mouseEl.style.touchAction || '').toBe('');
    expect(mouseEl.style.userSelect).toBe('none');
    const touchMenu = new Event('contextmenu', {bubbles: true, cancelable: true});
    Object.defineProperty(touchMenu, 'pointerType', {value: 'touch'});
    mouseEl.dispatchEvent(touchMenu);
    expect(touchMenu.defaultPrevented).toBe(false);
    mouseOnly.destroy();
    mouseEl.remove();
  });

  it('ignores interactive form controls and contenteditable by default, and supports ignoreTarget: false or custom predicates', () => {
    const card = document.createElement('div');
    const range = document.createElement('input');
    range.type = 'range';
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    const editableChild = document.createElement('span');
    editable.appendChild(editableChild);
    const nonEditable = document.createElement('div');
    nonEditable.setAttribute('contenteditable', 'false');
    const customIgnored = document.createElement('div');
    customIgnored.dataset.noGesture = 'true';
    card.append(range, textarea, select, editable, nonEditable, customIgnored);
    document.body.appendChild(card);

    const onPan = vi.fn();
    let gm = new GestureManager(card, {
      recognizers: [new PanRecognizer({onPan}, {slop: 4})],
    });

    const dragFrom = (el: HTMLElement, id: number) => {
      el.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: id, clientX: 0, timeStamp: id * 50})
      );
      document.dispatchEvent(
        pointerEvent('pointermove', {pointerId: id, clientX: 30, timeStamp: id * 50 + 16})
      );
      document.dispatchEvent(
        pointerEvent('pointerup', {pointerId: id, clientX: 30, timeStamp: id * 50 + 32})
      );
    };

    dragFrom(range, 1);
    dragFrom(textarea, 2);
    dragFrom(select, 3);
    dragFrom(editableChild, 4);
    expect(onPan).not.toHaveBeenCalled();

    // `contenteditable="false"` is NOT ignored:
    dragFrom(nonEditable, 5);
    expect(onPan).toHaveBeenCalledTimes(1);

    // Custom predicate ignores matching elements while allowing form controls:
    gm.destroy();
    gm = new GestureManager(card, {
      recognizers: [new PanRecognizer({onPan}, {slop: 4})],
      ignoreTarget: target =>
        target instanceof Element && Boolean(target.closest('[data-no-gesture]')),
    });
    dragFrom(customIgnored, 6);
    expect(onPan).toHaveBeenCalledTimes(1);
    dragFrom(range, 7);
    expect(onPan).toHaveBeenCalledTimes(2);

    // `ignoreTarget: false` disables target filtering completely:
    gm.destroy();
    gm = new GestureManager(card, {
      recognizers: [new PanRecognizer({onPan}, {slop: 4})],
      ignoreTarget: false,
    });
    dragFrom(customIgnored, 8);
    expect(onPan).toHaveBeenCalledTimes(3);

    gm.destroy();
    card.remove();
  });

  it('cancels an active gesture stream via cancel(), notifies recognizers, and recovers on the next gesture', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    outer.appendChild(inner);
    document.body.appendChild(outer);

    const onParentPan = vi.fn();
    const onParentEnd = vi.fn();
    const onParentCancel = vi.fn();
    const onChildPan = vi.fn();

    const parentGm = new GestureManager(outer, {
      propagate: true,
      recognizers: [
        new PanRecognizer(
          {onPan: onParentPan, onPanEnd: onParentEnd, onPanCancel: onParentCancel},
          {direction: 'horizontal', slop: 4}
        ),
      ],
    });
    const childGm = new GestureManager(inner, {
      propagate: true,
      recognizers: [
        new PanRecognizer(
          {
            onPanStart: () => parentGm.cancel(),
            onPan: onChildPan,
          },
          {direction: 'horizontal', slop: 8}
        ),
      ],
    });

    // Safe no-op when idle:
    parentGm.cancel();
    expect(onParentCancel).not.toHaveBeenCalled();

    // Parent begins panning first (slop 4), then child crosses slop 8 and cancels parent:
    inner.dispatchEvent(pointerEvent('pointerdown', {pointerId: 1, clientX: 0, clientY: 0}));
    document.dispatchEvent(pointerEvent('pointermove', {pointerId: 1, clientX: 5, clientY: 0}));
    expect(onParentPan).toHaveBeenCalledTimes(1);

    document.dispatchEvent(pointerEvent('pointermove', {pointerId: 1, clientX: 20, clientY: 0}));
    expect(onChildPan).toHaveBeenCalledTimes(1);
    expect(onParentCancel).toHaveBeenCalledTimes(1);

    // Subsequent moves and pointerup in the cancelled stream are ignored by parent:
    onParentPan.mockClear();
    document.dispatchEvent(pointerEvent('pointermove', {pointerId: 1, clientX: 40, clientY: 0}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 1, clientX: 40, clientY: 0}));
    expect(onParentPan).not.toHaveBeenCalled();
    expect(onParentEnd).not.toHaveBeenCalled();
    expect(onChildPan).toHaveBeenCalledTimes(2);

    // Next pointer sequence on outer works cleanly again:
    outer.dispatchEvent(pointerEvent('pointerdown', {pointerId: 2, clientX: 0, clientY: 0}));
    document.dispatchEvent(pointerEvent('pointermove', {pointerId: 2, clientX: 15, clientY: 0}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 2, clientX: 15, clientY: 0}));
    expect(onParentPan).toHaveBeenCalledTimes(1);
    expect(onParentEnd).toHaveBeenCalledTimes(1);

    childGm.destroy();
    parentGm.destroy();
    // Safe no-op after destroy:
    parentGm.cancel();
    outer.remove();
  });

  it('ignores form controls inside child Shadow DOM and respects nested contenteditable="false"', () => {
    const outerEditable = document.createElement('div');
    outerEditable.setAttribute('contenteditable', 'true');
    const card = document.createElement('div');
    const shadowHost = document.createElement('div');
    const shadow = shadowHost.attachShadow({mode: 'open'});
    const shadowInput = document.createElement('input');
    shadow.appendChild(shadowInput);

    const innerEditable = document.createElement('div');
    innerEditable.setAttribute('contenteditable', 'true');
    const nestedOptOut = document.createElement('div');
    nestedOptOut.setAttribute('contenteditable', 'FALSE');
    const nestedButton = document.createElement('button');
    nestedOptOut.appendChild(nestedButton);
    innerEditable.appendChild(nestedOptOut);

    const normalChild = document.createElement('div');
    card.append(shadowHost, innerEditable, normalChild);
    outerEditable.appendChild(card);
    document.body.appendChild(outerEditable);

    const onPan = vi.fn();
    const gm = new GestureManager(card, {
      recognizers: [new PanRecognizer({onPan}, {slop: 4})],
    });

    // Input inside a child Shadow DOM is ignored:
    shadowInput.dispatchEvent(pointerEvent('pointerdown', {pointerId: 1, clientX: 0}));
    document.dispatchEvent(pointerEvent('pointermove', {pointerId: 1, clientX: 30}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 1, clientX: 30}));
    expect(onPan).not.toHaveBeenCalled();

    // Outer contenteditable ancestor outside `card` does NOT suppress gestures on `normalChild`:
    normalChild.dispatchEvent(pointerEvent('pointerdown', {pointerId: 2, clientX: 0}));
    document.dispatchEvent(pointerEvent('pointermove', {pointerId: 2, clientX: 30}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 2, clientX: 30}));
    expect(onPan).toHaveBeenCalledTimes(1);

    // Nested `contenteditable="FALSE"` inside `contenteditable="true"` opts back in to gestures:
    nestedButton.dispatchEvent(pointerEvent('pointerdown', {pointerId: 3, clientX: 0}));
    document.dispatchEvent(pointerEvent('pointermove', {pointerId: 3, clientX: 30}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 3, clientX: 30}));
    expect(onPan).toHaveBeenCalledTimes(2);

    gm.destroy();
    outerEditable.remove();
  });

  it('respects ignoreTarget on dragstart and ignores secondary touches landing on ignored targets', () => {
    const card = document.createElement('div');
    const draggableChild = document.createElement('div');
    draggableChild.dataset.allowDrag = 'true';
    const input = document.createElement('input');
    const normalChild = document.createElement('div');
    card.append(draggableChild, input, normalChild);
    document.body.appendChild(card);

    const onScale = vi.fn();
    const gm = new GestureManager(card, {
      recognizers: [new ScaleRecognizer({onScale}, {spanSlop: 4, minSpan: 10})],
      ignoreTarget: target =>
        target instanceof Element && Boolean(target.closest('[data-allow-drag]')),
    });

    const normalDrag = new Event('dragstart', {bubbles: true, cancelable: true});
    normalChild.dispatchEvent(normalDrag);
    expect(normalDrag.defaultPrevented).toBe(true);

    const allowedDrag = new Event('dragstart', {bubbles: true, cancelable: true});
    draggableChild.dispatchEvent(allowedDrag);
    expect(allowedDrag.defaultPrevented).toBe(false);

    // Secondary touch landing on an ignored input must not join an active multi-touch stream:
    gm.destroy();
    const gmDefaultIgnore = new GestureManager(card, {
      recognizers: [new ScaleRecognizer({onScale}, {spanSlop: 4, minSpan: 10})],
    });
    normalChild.dispatchEvent(
      pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 10, clientX: 0, clientY: 0})
    );
    input.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerType: 'touch',
        pointerId: 11,
        isPrimary: false,
        clientX: 100,
        clientY: 0,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {
        pointerType: 'touch',
        pointerId: 11,
        isPrimary: false,
        clientX: 200,
        clientY: 0,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {
        pointerType: 'touch',
        pointerId: 11,
        isPrimary: false,
        clientX: 200,
        clientY: 0,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerType: 'touch', pointerId: 10, clientX: 0, clientY: 0})
    );
    expect(onScale).not.toHaveBeenCalled();

    gmDefaultIgnore.destroy();
    card.remove();
  });

  it('cancels pending multi-tap timers when cancel() is called between taps', () => {
    vi.useFakeTimers();
    try {
      const onTap = vi.fn();
      const onDoubleTap = vi.fn();
      const doubleTap = new TapRecognizer({onTap: onDoubleTap}, {taps: 2});
      const singleTap = new TapRecognizer({onTap}).requireFailureOf(doubleTap);

      const gm = new GestureManager(element, {recognizers: [singleTap, doubleTap]});

      element.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 0})
      );
      document.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 20})
      );

      gm.cancel();
      vi.advanceTimersByTime(400);
      expect(onTap).not.toHaveBeenCalled();
      expect(onDoubleTap).not.toHaveBeenCalled();

      gm.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('skips PointerEvent.getCoalescedEvents() unless a registered recognizer needs coalesced history', () => {
    const tapOnly = new GestureManager(element, {recognizers: [new TapRecognizer({})]});

    const moveWithoutPan = pointerEvent('pointermove', {
      pointerId: 1,
      clientX: 12,
      clientY: 10,
      timeStamp: 16,
    });
    const skippedSpy = vi.fn(() => []);
    Object.defineProperty(moveWithoutPan, 'getCoalescedEvents', {value: skippedSpy});

    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 0})
    );
    document.dispatchEvent(moveWithoutPan);
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 1, clientX: 12, clientY: 10, timeStamp: 32})
    );
    expect(skippedSpy).not.toHaveBeenCalled();
    tapOnly.destroy();

    const withPan = new GestureManager(element, {
      recognizers: [new TapRecognizer({}), new PanRecognizer({})],
    });

    const moveWithPan = pointerEvent('pointermove', {
      pointerId: 2,
      clientX: 30,
      clientY: 10,
      timeStamp: 66,
    });
    const usedSpy = vi.fn(() => [moveWithPan]);
    Object.defineProperty(moveWithPan, 'getCoalescedEvents', {value: usedSpy});

    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 2, clientX: 10, clientY: 10, timeStamp: 50})
    );
    document.dispatchEvent(moveWithPan);
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 2, clientX: 30, clientY: 10, timeStamp: 82})
    );
    expect(usedSpy).toHaveBeenCalledTimes(1);

    withPan.destroy();
  });

  it('ignores non-primary mouse buttons pressed outside the element during an active drag', () => {
    const onPan = vi.fn();
    const onPanCancel = vi.fn();
    const gm = new GestureManager(element, {
      recognizers: [new PanRecognizer({onPan, onPanCancel}, {slop: 4})],
    });

    element.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerType: 'touch',
        pointerId: 1,
        isPrimary: true,
        clientX: 0,
        clientY: 0,
        timeStamp: 0,
      })
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {
        pointerType: 'touch',
        pointerId: 1,
        isPrimary: true,
        clientX: 20,
        clientY: 0,
        timeStamp: 16,
      })
    );
    expect(onPan).toHaveBeenCalledTimes(1);

    // Middle-click (button: 1) outside `element` must not abort the active touch drag:
    document.body.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerType: 'mouse',
        pointerId: 2,
        isPrimary: true,
        button: 1,
        clientX: 200,
        clientY: 200,
        timeStamp: 24,
      })
    );
    expect(onPanCancel).not.toHaveBeenCalled();

    document.dispatchEvent(
      pointerEvent('pointermove', {
        pointerType: 'touch',
        pointerId: 1,
        isPrimary: true,
        clientX: 40,
        clientY: 0,
        timeStamp: 32,
      })
    );
    expect(onPan).toHaveBeenCalledTimes(2);

    gm.destroy();
  });

  it('coordinates nested gesture surfaces automatically (including Shadow DOM), respects propagate: true, and preserves disjoint fingers', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    const shadowHost = document.createElement('div');
    const shadow = shadowHost.attachShadow({mode: 'open'});
    const shadowInner = document.createElement('div');
    shadow.appendChild(shadowInner);
    outer.append(inner, shadowHost);
    document.body.appendChild(outer);

    // 1. Inner pan inside outer pan (same slop): inner wins and cancels outer automatically.
    const onOuterPan = vi.fn();
    const onInnerPan = vi.fn();
    const onOuterTap = vi.fn();
    const onInnerTap = vi.fn();

    const outerGm = new GestureManager(outer, {
      recognizers: [
        new PanRecognizer({onPan: onOuterPan}, {direction: 'horizontal', slop: 4}),
        new TapRecognizer({onTap: onOuterTap}),
      ],
    });
    const innerGm = new GestureManager(inner, {
      recognizers: [
        new PanRecognizer({onPan: onInnerPan}, {direction: 'horizontal', slop: 4}),
        new TapRecognizer({onTap: onInnerTap}),
      ],
    });

    inner.dispatchEvent(pointerEvent('pointerdown', {pointerId: 1, clientX: 0, timeStamp: 0}));
    document.dispatchEvent(pointerEvent('pointermove', {pointerId: 1, clientX: 20, timeStamp: 16}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 1, clientX: 20, timeStamp: 32}));
    expect(onInnerPan).toHaveBeenCalledTimes(1);
    expect(onOuterPan).not.toHaveBeenCalled();

    // 2. Inner tap cancels outer tap; tapping outer directly fires outer tap.
    inner.dispatchEvent(pointerEvent('pointerdown', {pointerId: 2, clientX: 10, timeStamp: 100}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 2, clientX: 10, timeStamp: 120}));
    expect(onInnerTap).toHaveBeenCalledTimes(1);
    expect(onOuterTap).not.toHaveBeenCalled();

    outer.dispatchEvent(pointerEvent('pointerdown', {pointerId: 3, clientX: 10, timeStamp: 200}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 3, clientX: 10, timeStamp: 220}));
    expect(onOuterTap).toHaveBeenCalledTimes(1);

    // 3. Disjoint fingers: dragging outer with finger #4 while finger #5 taps an isolated child
    // (stopped from joining outer's stream) keeps outer's drag alive because pointer IDs don't overlap.
    onOuterPan.mockClear();
    onInnerTap.mockClear();
    const stopDown = (e: Event) => e.stopPropagation();
    inner.addEventListener('pointerdown', stopDown);
    outer.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 4, isPrimary: true, clientX: 0, timeStamp: 300})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 4, isPrimary: true, clientX: 20, timeStamp: 316})
    );
    expect(onOuterPan).toHaveBeenCalledTimes(1);
    inner.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 5, isPrimary: false, clientX: 50, timeStamp: 320})
    );
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 5, isPrimary: false, clientX: 50, timeStamp: 340})
    );
    expect(onInnerTap).toHaveBeenCalledTimes(1);
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 4, isPrimary: true, clientX: 40, timeStamp: 350})
    );
    expect(onOuterPan).toHaveBeenCalledTimes(2);
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 4, isPrimary: true, clientX: 40, timeStamp: 360})
    );
    inner.removeEventListener('pointerdown', stopDown);

    // 4. Shadow DOM inner surface cancels light-DOM ancestor surface.
    const onShadowPan = vi.fn();
    const shadowGm = new GestureManager(shadowInner, {
      recognizers: [new PanRecognizer({onPan: onShadowPan}, {direction: 'horizontal', slop: 4})],
    });
    onOuterPan.mockClear();
    shadowInner.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 6, clientX: 0, timeStamp: 400})
    );
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 6, clientX: 25, timeStamp: 416})
    );
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 6, clientX: 25, timeStamp: 432}));
    expect(onShadowPan).toHaveBeenCalledTimes(1);
    expect(onOuterPan).not.toHaveBeenCalled();

    // 5. Outer continuous winner cancels descendant when outer claims first (e.g. smaller slop).
    shadowGm.destroy();
    innerGm.destroy();
    outerGm.destroy();

    const onOuterFastPan = vi.fn();
    const onInnerSlowPan = vi.fn();
    const outerFastGm = new GestureManager(outer, {
      recognizers: [new PanRecognizer({onPan: onOuterFastPan}, {slop: 4})],
    });
    const innerSlowGm = new GestureManager(inner, {
      recognizers: [new PanRecognizer({onPan: onInnerSlowPan}, {slop: 16})],
    });
    inner.dispatchEvent(pointerEvent('pointerdown', {pointerId: 7, clientX: 0, timeStamp: 500}));
    document.dispatchEvent(pointerEvent('pointermove', {pointerId: 7, clientX: 8, timeStamp: 516}));
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 7, clientX: 30, timeStamp: 532})
    );
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 7, clientX: 30, timeStamp: 548}));
    expect(onOuterFastPan).toHaveBeenCalledTimes(2);
    expect(onInnerSlowPan).not.toHaveBeenCalled();
    innerSlowGm.destroy();
    outerFastGm.destroy();

    // 6. `propagate: true` allows nested surfaces to observe simultaneously without cancelling each other
    // or fighting over `setPointerCapture` / `lostpointercapture` on continuous gestures:
    const onObserverTap = vi.fn();
    const onCardTap = vi.fn();
    const onObserverPan = vi.fn();
    const onCardPan = vi.fn();
    const onObserverPanCancel = vi.fn();
    const onCardPanCancel = vi.fn();

    let captureOwner: HTMLElement | null = null;
    for (const el of [outer, inner]) {
      el.setPointerCapture = (id: number) => {
        if (captureOwner && captureOwner !== el) {
          const prev = captureOwner;
          captureOwner = el;
          prev.dispatchEvent(pointerEvent('lostpointercapture', {pointerId: id}));
        } else {
          captureOwner = el;
        }
      };
      el.hasPointerCapture = () => captureOwner === el;
      el.releasePointerCapture = () => {
        if (captureOwner === el) captureOwner = null;
      };
    }

    const observerGm = new GestureManager(outer, {
      propagate: true,
      recognizers: [
        new TapRecognizer({onTap: onObserverTap}),
        new PanRecognizer({onPan: onObserverPan, onPanCancel: onObserverPanCancel}, {slop: 4}),
      ],
    });
    const cardGm = new GestureManager(inner, {
      recognizers: [
        new TapRecognizer({onTap: onCardTap}),
        new PanRecognizer({onPan: onCardPan, onPanCancel: onCardPanCancel}, {slop: 8}),
      ],
    });
    inner.dispatchEvent(pointerEvent('pointerdown', {pointerId: 8, clientX: 10, timeStamp: 600}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 8, clientX: 10, timeStamp: 620}));
    expect(onCardTap).toHaveBeenCalledTimes(1);
    expect(onObserverTap).toHaveBeenCalledTimes(1);

    // Outer pan starts first (slop 4), inner pan starts second (slop 8) and captures without cancelling outer:
    inner.dispatchEvent(pointerEvent('pointerdown', {pointerId: 9, clientX: 0, timeStamp: 700}));
    document.dispatchEvent(pointerEvent('pointermove', {pointerId: 9, clientX: 6, timeStamp: 716}));
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 9, clientX: 20, timeStamp: 732})
    );
    document.dispatchEvent(pointerEvent('pointerup', {pointerId: 9, clientX: 20, timeStamp: 748}));
    expect(onObserverPan).toHaveBeenCalledTimes(2);
    expect(onCardPan).toHaveBeenCalledTimes(1);
    expect(onObserverPanCancel).not.toHaveBeenCalled();
    expect(onCardPanCancel).not.toHaveBeenCalled();

    cardGm.destroy();
    observerGm.destroy();
    outer.remove();
  });

  it('supports enabled: false without attaching listeners or mutating element styles, and populates pointerType and target on events', () => {
    const box = document.createElement('div');
    const child = document.createElement('span');
    box.appendChild(child);
    document.body.appendChild(box);

    const addListenerSpy = vi.spyOn(box, 'addEventListener');
    const onDisabledTap = vi.fn();
    const disabledGm = new GestureManager(box, {
      enabled: false,
      recognizers: [new TapRecognizer({onTap: onDisabledTap}), new PanRecognizer({})],
    });
    expect(addListenerSpy).not.toHaveBeenCalled();
    expect(disabledGm.computeTouchAction()).toBe('auto');
    expect(box.style.touchAction || '').toBe('');
    expect(box.style.userSelect || '').toBe('');

    child.dispatchEvent(pointerEvent('pointerdown', {pointerId: 1, clientX: 5, timeStamp: 0}));
    child.dispatchEvent(pointerEvent('pointerup', {pointerId: 1, clientX: 5, timeStamp: 20}));
    expect(onDisabledTap).not.toHaveBeenCalled();
    disabledGm.destroy();

    const onTap = vi.fn();
    const onPan = vi.fn();
    const activeGm = new GestureManager(box, {
      recognizers: [new TapRecognizer({onTap}), new PanRecognizer({onPan}, {slop: 4})],
    });

    child.dispatchEvent(
      pointerEvent('pointerdown', {pointerType: 'pen', pointerId: 2, clientX: 5, timeStamp: 50})
    );
    child.dispatchEvent(
      pointerEvent('pointerup', {pointerType: 'pen', pointerId: 2, clientX: 5, timeStamp: 70})
    );
    expect(onTap).toHaveBeenCalledWith(
      expect.objectContaining({pointerType: 'pen', target: child})
    );

    child.dispatchEvent(
      pointerEvent('pointerdown', {pointerType: 'mouse', pointerId: 3, clientX: 0, timeStamp: 100})
    );
    child.dispatchEvent(
      pointerEvent('pointermove', {pointerType: 'mouse', pointerId: 3, clientX: 20, timeStamp: 116})
    );
    child.dispatchEvent(
      pointerEvent('pointerup', {pointerType: 'mouse', pointerId: 3, clientX: 20, timeStamp: 132})
    );
    expect(onPan).toHaveBeenCalledWith(
      expect.objectContaining({pointerType: 'mouse', target: child})
    );

    activeGm.destroy();
    box.remove();
  });
});
