import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {GestureManager} from '../src/gesture_manager';
import {GestureRecognizer} from '../src/gesture_recognizer';
import {MotionAction, type MotionEvent} from '../src/motion_event';
import {LongPressRecognizer} from '../src/recognizers/long_press_recognizer';
import {PanRecognizer} from '../src/recognizers/pan_recognizer';
import {QuickScaleRecognizer} from '../src/recognizers/quick_scale_recognizer';
import {RotateRecognizer} from '../src/recognizers/rotate_recognizer';
import {ScaleRecognizer} from '../src/recognizers/scale_recognizer';
import {TapRecognizer} from '../src/recognizers/tap_recognizer';
import {pointerEvent} from './test_helpers';

class SpyRecognizer extends GestureRecognizer {
  readonly type = 'spy';
  readonly events: MotionEvent[] = [];
  cancelled = false;

  /** @internal */
  override get acceptsMultiTouch(): boolean {
    return true;
  }

  onMotionEvent(event: MotionEvent): void {
    this.events.push(event);
    if (event.action === MotionAction.DOWN) {
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
    expect(recognizer.events[0].action).toBe(MotionAction.DOWN);
  });

  it('ignores unsupported pointer types', () => {
    const touchOnly = new GestureManager(element, {supportedPointerTypes: ['touch']});
    const spy = new SpyRecognizer();
    touchOnly.register(spy);

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
    const gm = new GestureManager(container, {supportedPointerTypes: ['touch', 'mouse']});
    gm.register(new TapRecognizer({onTap}), new PanRecognizer({onPanStart}, {slop: 8}));

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

    const gm = new GestureManager(container);
    const rotate = new RotateRecognizer({onRotate}, {rotationSlop: 2, minSpan: 20});
    gm.register(
      new ScaleRecognizer(
        {onScaleStart, onScale, onScaleCancel},
        {spanSlop: 8, minSpan: 20}
      ).simultaneousWith(rotate),
      rotate
    );

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

  it('cancels active gestures cleanly on lostpointercapture mid-gesture', () => {
    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 1}));
    expect(recognizer.active).toBe(true);

    element.dispatchEvent(pointerEvent('lostpointercapture', {pointerType: 'touch', pointerId: 1}));
    expect(recognizer.cancelled).toBe(true);
    expect(recognizer.active).toBe(false);
  });

  it('cleans up listeners on destroy', () => {
    manager.destroy();
    manager.destroy();
    manager.register(new SpyRecognizer());
    manager.unregister(recognizer);
    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 1}));
    expect(recognizer.events).toHaveLength(0);
  });

  it('covers config, unregister, reset, document pointerup/cancel, and touchAction: false', () => {
    const unstyledEl = document.createElement('div');
    document.body.appendChild(unstyledEl);
    const customManager = new GestureManager(unstyledEl, {
      supportedPointerTypes: ['touch', 'mouse'],
      touchAction: false,
      viewConfiguration: {touchSlop: 12},
    });
    expect(customManager.config.touchSlop).toBe(12);
    expect(unstyledEl.style.touchAction || '').toBe('');

    const spy = new SpyRecognizer();
    customManager.register(spy);
    expect(unstyledEl.style.touchAction || '').toBe('');

    unstyledEl.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 1}));
    unstyledEl.dispatchEvent(pointerEvent('pointermove', {pointerType: 'touch', pointerId: 1}));
    unstyledEl.dispatchEvent(pointerEvent('pointerup', {pointerType: 'touch', pointerId: 1}));
    expect(spy.events).toHaveLength(3);
    customManager.reset();

    customManager.unregister(spy);
    unstyledEl.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 5}));
    expect(spy.events).toHaveLength(3);
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

  it('dynamically computes and diffs least-restrictive CSS touch-action without scroll-locking mobile pages', () => {
    const card = document.createElement('div');
    document.body.appendChild(card);

    const addListenerSpy = vi.spyOn(card, 'addEventListener');
    const gm = new GestureManager(card);
    expect(card.style.touchAction || '').toBe('');

    const mouseTapSpy = vi.fn();
    const tap = new TapRecognizer({onTap: mouseTapSpy});
    gm.register(tap);
    expect(gm.computeTouchAction()).toBe('manipulation');
    expect(card.style.touchAction).toBe('manipulation');
    expect(card.style.userSelect || '').toBe('');
    expect(addListenerSpy.mock.calls.some(([type]) => type === 'touchmove')).toBe(false);

    const listenerCountBeforeSecondTap = addListenerSpy.mock.calls.length;
    const secondTap = new TapRecognizer({});
    gm.register(secondTap);
    expect(addListenerSpy.mock.calls.length).toBe(listenerCountBeforeSecondTap);
    gm.unregister(secondTap);

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

    const horizPan = new PanRecognizer({}, {direction: 'horizontal'});
    gm.register(horizPan);
    expect(card.style.touchAction).toBe('pan-y pinch-zoom');
    expect(card.style.userSelect).toBe('none');
    expect((card.style as unknown as Record<string, string>).webkitTouchCallout).toBe('none');

    const scale = new ScaleRecognizer({});
    gm.register(scale);
    expect(card.style.touchAction).toBe('pan-y');

    gm.unregister(horizPan);
    expect(card.style.touchAction).toBe('pan-x pan-y');

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

    gm.unregister(scale, tap);
    expect(card.style.touchAction).toBe('');
    expect(card.style.userSelect || '').toBe('');

    const explicitActionEl = document.createElement('div');
    const gmExplicitAction = new GestureManager(explicitActionEl, {touchAction: 'pan-x'});
    expect(explicitActionEl.style.touchAction).toBe('pan-x');
    gmExplicitAction.destroy();

    gm.destroy();
    card.remove();
  });

  it('coexists cleanly with iOS Safari scrolling, 2-finger GestureEvent zoom, QuickScaleRecognizer, and directional Pan/Swipe', () => {
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
    const gmCarousel = new GestureManager(carousel);
    gmCarousel.register(new PanRecognizer({onPan}, {direction: 'horizontal', slop: 8}));

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
    const gmSwipe = new GestureManager(swipeCard);
    gmSwipe.register(new PanRecognizer({onSwipe}, {direction: 'horizontal'}));

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
    const gmVertSwipe = new GestureManager(swipeCard);
    gmVertSwipe.register(new PanRecognizer({}, {direction: 'vertical'}));
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

    (window as unknown as Record<string, unknown>).GestureEvent = class MockGestureEvent extends (
      Event
    ) {};
    try {
      const photo = document.createElement('div');
      document.body.appendChild(photo);
      const gmPhoto = new GestureManager(photo);
      gmPhoto.register(new ScaleRecognizer({}), new QuickScaleRecognizer({}));
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

  it('aborts stuck pointers on window blur and hidden visibilitychange, suppresses ancestor ghost clicks without eating fast clicks elsewhere, and short-circuits dead streams', () => {
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

      const gm = new GestureManager(innerCard);
      const tap = new TapRecognizer({});
      const pan = new PanRecognizer({onPanCancel, onPanEnd}, {slop: 5});
      gm.register(tap, pan);

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

      gm.unregister(pan);
      const coalescedSpy = vi.fn(() => []);
      innerCard.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 7, clientX: 0, clientY: 0, timeStamp: 300})
      );
      const movePastSlop = pointerEvent('pointermove', {
        pointerId: 7,
        clientX: 25,
        clientY: 0,
        timeStamp: 316,
      });
      Object.defineProperty(movePastSlop, 'getCoalescedEvents', {value: coalescedSpy});
      innerCard.dispatchEvent(movePastSlop);
      expect(coalescedSpy).not.toHaveBeenCalled();

      const moveSpy = vi.spyOn(tap, 'onMotionEvent');
      innerCard.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 7, clientX: 60, clientY: 0, timeStamp: 332})
      );
      expect(moveSpy).not.toHaveBeenCalled();
      innerCard.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 7, clientX: 60, clientY: 0, timeStamp: 348})
      );

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
    expect(recognizer.events.at(-1)?.action).toBe(MotionAction.UP);
  });

  it('suppresses ghost clicks retargeted to a light-DOM ancestor of a shadow-DOM surface', () => {
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

      const ghost = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
      outer.dispatchEvent(ghost);
      expect(ghost.defaultPrevented).toBe(true);

      gm.destroy();
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

  it('keeps directional Pan / LongPress surfaces free of idle touchmove listeners and supports SVGElement targets', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(svg);

    const addSpy = vi.spyOn(svg, 'addEventListener');
    const removeSpy = vi.spyOn(svg, 'removeEventListener');
    const onPan = vi.fn();
    const onPanCancel = vi.fn();

    const gm = new GestureManager(svg, {
      recognizers: [new PanRecognizer({onPan, onPanCancel}, {direction: 'horizontal', slop: 6})],
    });
    expect(gm.element).toBe(svg);
    expect(svg.style.touchAction).toBe('pan-y pinch-zoom');
    // Zero idle non-passive `touchmove` listeners on directional Pan surfaces:
    expect(addSpy.mock.calls.some(([type]) => type === 'touchmove')).toBe(false);

    // Mouse input never attaches a `touchmove` listener:
    svg.dispatchEvent(
      pointerEvent('pointerdown', {pointerType: 'mouse', pointerId: 1, clientX: 0, clientY: 0})
    );
    expect(addSpy.mock.calls.some(([type]) => type === 'touchmove')).toBe(false);
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerType: 'mouse', pointerId: 1, clientX: 0, clientY: 0})
    );

    // Touch input attaches `touchmove` dynamically and detaches it as soon as vertical scroll fails Pan:
    svg.dispatchEvent(
      pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 2, clientX: 0, clientY: 0})
    );
    expect(addSpy.mock.calls.filter(([type]) => type === 'touchmove')).toHaveLength(1);
    document.dispatchEvent(
      pointerEvent('pointermove', {pointerType: 'touch', pointerId: 2, clientX: 0, clientY: 20})
    );
    expect(removeSpy.mock.calls.filter(([type]) => type === 'touchmove')).toHaveLength(1);
    document.dispatchEvent(
      pointerEvent('pointerup', {pointerType: 'touch', pointerId: 2, clientX: 0, clientY: 20})
    );

    gm.setOptions({touchAction: 'none', viewConfiguration: {touchSlop: 16}});
    expect(gm.config.touchSlop).toBe(16);
    expect(svg.style.touchAction).toBe('none');

    // Partial `setOptions` updates only specified properties without wiping existing config:
    gm.setOptions({supportedPointerTypes: ['touch', 'pen']});
    expect(gm.config.touchSlop).toBe(16);
    expect(svg.style.touchAction).toBe('none');

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

    gm.destroy();
    gm.setOptions({touchAction: 'manipulation'});
    svg.remove();
  });
});
